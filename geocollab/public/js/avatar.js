/**
 * avatar.js — Full-body avatar with voice activity ring, dynamic name/color
 */

// ── NAF Schema ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF !== 'undefined') {
        NAF.schemas.add({
            template: '#avatar-template',
            components: [
                'position',
                'rotation'
            ]
        });
    }
});

// ── Avatar body component ────────────────────────────────────────────────────
AFRAME.registerComponent('avatar-body', {
    init: function () {
        const state = window.GeoCollab ? window.GeoCollab.userState : null;

        // Resolve color from user state OR choose a random one
        const colors  = ['#4CC3D9', '#FFC65D', '#7BC8A4', '#F16745', '#AA88FF', '#FFD700'];
        const myColor = (state && state.color) ? state.color
                      : colors[Math.floor(Math.random() * colors.length)];

        const myName  = (state && state.name)  ? state.name : 'Operator';

        // Apply color to head, torso, arms
        this._applyColor(myColor);

        // Apply name label
        const nameEl = this.el.querySelector('.av-name');
        if (nameEl) nameEl.setAttribute('value', myName);

        // Keep a ref so voice.js can toggle the ring
        this.voiceRing = this.el.querySelector('.av-voice-ring');

        // Listen for voice activity from other clients
        document.addEventListener('remoteVoiceActivity', (evt) => {
            if (evt.detail.clientId === this._clientId()) {
                this._setVoiceActive(evt.detail.speaking);
            }
        });

        // Pulse animation on voice ring
        if (this.voiceRing) {
            this.voiceRing.setAttribute('animation', `
                property: scale;
                dir: alternate;
                dur: 400;
                easing: easeInOutSine;
                loop: true;
                to: 1.15 1.15 1.15;
                startEvents: voiceStart;
                pauseEvents: voiceStop;
            `);
        }
    },

    _applyColor: function (color) {
        const parts = ['av-head', 'av-torso', 'av-arm-l', 'av-arm-r'];
        parts.forEach(cls => {
            const el = this.el.querySelector('.' + cls);
            if (el) {
                el.setAttribute('material', { color });
            }
        });
    },

    _clientId: function () {
        // NAF attaches the clientId to the entity's parent when networked
        const net = this.el.components && this.el.components.networked;
        return net ? net.data.networkId : null;
    },

    _setVoiceActive: function (active) {
        if (this.voiceRing) {
            this.voiceRing.setAttribute('visible', active);
            if (active) this.voiceRing.emit('voiceStart');
            else        this.voiceRing.emit('voiceStop');
        }
    }
});
