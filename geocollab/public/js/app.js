// Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // Setup mic permission UI
    const micButton = document.getElementById('mic-btn');
    const uiOverlay = document.getElementById('ui-overlay');

    if (micButton) {
        micButton.addEventListener('click', () => {
            // Request mic permission for WebRTC
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    console.log('Microphone access granted');
                    if (uiOverlay) uiOverlay.style.display = 'none';
                })
                .catch((err) => {
                    console.error('Microphone access denied', err);
                    alert('Microphone access is required for voice chat.');
                });
        });
    }

    // Global VR Event Debugger (Catch all events and display in VR)
    setTimeout(() => {
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl) {
            const eventsToLog = [
                'triggerdown', 'gripdown', 'thumbstickdown', 'bbuttondown',
                'abuttondown', 'xbuttondown', 'ybuttondown', 'pinchstarted'
            ];
            eventsToLog.forEach(evtName => {
                sceneEl.addEventListener(evtName, (e) => {
                    const chatPanel = document.querySelector('#chat-panel');
                    if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                        chatPanel.components['canvas-ui-panel'].pushMessage(`Input Detected: ${evtName}`);
                    }
                });
            });
        }
    }, 2000);
});
