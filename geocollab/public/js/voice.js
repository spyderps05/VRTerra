/**
 * voice.js — Mic toggle, voice activity detection, NAF broadcast
 */

AFRAME.registerComponent('voice-toggle', {
    schema: {
        threshold: { type: 'number', default: 18 }
    },

    init: function () {
        this.micEnabled = true;
        this.analyser   = null;
        this.dataArray  = null;
        this.isSpeaking = false;
        this._broadcastTick = 0;

        // A-button on right controller = mute/unmute
        this.el.addEventListener('abuttondown', this.toggleMute.bind(this));

        // Set up analyser once mic permission is granted
        document.addEventListener('micPermissionGranted', (e) => {
            this._setupAnalyser(e.detail.stream);
        });
    },

    _setupAnalyser: function (stream) {
        try {
            const ctx   = new (window.AudioContext || window.webkitAudioContext)();
            const src   = ctx.createMediaStreamSource(stream);
            this.analyser = ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.6;
            src.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            console.log('[Voice] Audio analyser initialised');
        } catch (e) {
            console.warn('[Voice] AudioContext failed:', e);
        }
    },

    toggleMute: function () {
        this.micEnabled = !this.micEnabled;

        if (typeof NAF !== 'undefined' && NAF.connection && NAF.connection.adapter) {
            try { NAF.connection.adapter.enableMicrophone(this.micEnabled); } catch(e) {}
        }

        const micEl = document.getElementById('hud-mic');
        if (micEl) {
            micEl.textContent = this.micEnabled ? '⬤ LIVE' : '⬤ MUTED';
            micEl.className   = this.micEnabled ? 'mic-live' : 'mic-muted';
        }

        if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
            window.GeoCollab.postSystemMessage(
                `Microphone ${this.micEnabled ? 'unmuted' : 'muted'}.`
            );
        }
    },

    tick: function (time) {
        if (!this.analyser || !this.micEnabled || !this.dataArray) return;

        // Only analyse every ~80ms to save CPU
        if (time - this._broadcastTick < 80) return;
        this._broadcastTick = time;

        this.analyser.getByteFrequencyData(this.dataArray);
        const avg = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
        const speaking = avg > this.data.threshold;

        if (speaking !== this.isSpeaking) {
            this.isSpeaking = speaking;

            // Animate local avatar voice ring
            const player = document.querySelector('#player');
            if (player) {
                const ring = player.querySelector && player.querySelector('.av-voice-ring');
                if (ring) ring.setAttribute('visible', speaking);
            }

            // Broadcast via NAF data channel
            if (typeof NAF !== 'undefined' && NAF.connection && NAF.connection.isConnected()) {
                NAF.connection.broadcastData('voiceActivity', { speaking });
            }
        }
    }
});

// ── Receive remote voice activity ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF === 'undefined') return;

    // Wait for NAF to be ready
    const trySubscribe = (attempts = 0) => {
        if (typeof NAF !== 'undefined' && NAF.connection) {
            NAF.connection.subscribeToDataChannel('voiceActivity', (senderId, dataType, data) => {
                document.dispatchEvent(new CustomEvent('remoteVoiceActivity', {
                    detail: { clientId: senderId, speaking: data.speaking }
                }));
            });
        } else if (attempts < 20) {
            setTimeout(() => trySubscribe(attempts + 1), 500);
        }
    };
    trySubscribe();
});
