// Voice chat and WebRTC handling is primarily managed by Networked-Aframe's 'networked-audio-source'
// This file serves as an extension point for advanced voice controls (e.g. mute/unmute)

AFRAME.registerComponent('voice-toggle', {
    init: function () {
        this.micEnabled = true;
        // Bind to A button on right controller
        this.el.addEventListener('abuttondown', this.toggleMute.bind(this));
    },
    toggleMute: function () {
        if (typeof NAF !== 'undefined' && NAF.connection.adapter) {
            this.micEnabled = !this.micEnabled;
            NAF.connection.adapter.enableMicrophone(this.micEnabled);

            // Optional: Provide UI feedback
            const chatPanel = document.querySelector('#chat-panel');
            if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                chatPanel.components['canvas-ui-panel'].pushMessage('System: Microphone ' + (this.micEnabled ? 'Unmuted' : 'Muted'));
            }
        }
    }
});
