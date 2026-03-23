// VR Comfort & Polish features

// Handle Disconnections Gracefully
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF !== 'undefined') {
        document.body.addEventListener('clientDisconnected', function (evt) {
            console.log('Client disconnected', evt.detail.clientId);
            const chatPanel = document.querySelector('#chat-panel');
            if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                chatPanel.components['canvas-ui-panel'].pushMessage('System: User left the room.');
            }
        });

        document.body.addEventListener('clientConnected', function (evt) {
            console.log('Client connected', evt.detail.clientId);
            const chatPanel = document.querySelector('#chat-panel');
            if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                chatPanel.components['canvas-ui-panel'].pushMessage('System: User joined the room.');
            }
        });
    }
});

// Basic Progress UI for Terrain Loading
AFRAME.registerComponent('terrain-loading-ui', {
    init: function () {
        const textEl = document.createElement('a-text');
        textEl.setAttribute('value', 'Loading Terrain...');
        textEl.setAttribute('position', '0 1 1');
        textEl.setAttribute('scale', '0.5 0.5 0.5');
        textEl.setAttribute('align', 'center');
        textEl.setAttribute('color', 'yellow');
        this.el.appendChild(textEl);

        // Once loaded
        this.el.addEventListener('loaded', () => {
            setTimeout(() => {
                if (this.el.contains(textEl)) {
                    this.el.removeChild(textEl);
                }
            }, 2000);
        });
    }
});

// Simple Screenshot tool bound to the right controller trigger as an alternative if needed
// A-Frame already has a screenshot component `<a-scene screenshot>` mapped to keyboard.

// Basic Snap Turn Comfort Feature
AFRAME.registerComponent('snap-turn', {
    schema: {
        turnAngle: { type: 'number', default: 45 }
    },
    init: function () {
        this.el.addEventListener('axismove', (evt) => {
            // Use parent entity for rotation if this is attached to controller
            const rig = this.el.sceneEl.querySelector('#player');
            if (!rig || !this.canTurn) return;

            if (evt.detail.axis[0] > 0.8) {
                if (AFRAME.THREE) {
                    rig.object3D.rotation.y -= AFRAME.THREE.MathUtils.degToRad(this.data.turnAngle);
                }
                this.canTurn = false;
                setTimeout(() => this.canTurn = true, 500);
            } else if (evt.detail.axis[0] < -0.8) {
                if (AFRAME.THREE) {
                    rig.object3D.rotation.y += AFRAME.THREE.MathUtils.degToRad(this.data.turnAngle);
                }
                this.canTurn = false;
                setTimeout(() => this.canTurn = true, 500);
            }
        });
        this.canTurn = true;
    }
});

// Seated mode: Recalibrate rig height on thumbstick press
AFRAME.registerComponent('seated-mode', {
    init: function () {
        const calibrate = () => {
            const rig = this.el; // #player
            const camera = this.el.querySelector('[camera]');
            if (rig && camera) {
                // Calibrate so eyes sit at ~0.9m (just above the 0.6m table)
                const currentLocalY = camera.object3D.position.y;
                rig.object3D.position.y = 0.9 - currentLocalY;

                const chatPanel = document.querySelector('#chat-panel');
                if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                    chatPanel.components['canvas-ui-panel'].pushMessage('System: Seated height calibrated.');
                }
            }
        };

        // Leverage event bubbling! A-Frame controller events bubble to the scene.
        // Failsafe: User confirmed X and Y buttons fire reliably on Quest 3, while thumbstickdown doesn't always.
        this.el.sceneEl.addEventListener('thumbstickdown', calibrate);
        this.el.sceneEl.addEventListener('xbuttondown', calibrate);
        this.el.sceneEl.addEventListener('ybuttondown', calibrate);

        // Export calibrate to be globally accessible for the dashboard fallback button
        window.calibrateSeatedHeight = calibrate;
    }
});

// Provides visual feedback when the laser pointer intersects a dashboard button
AFRAME.registerComponent('ui-button', {
    schema: {
        hoverColor: { type: 'color', default: '#ffeb3b' }
    },
    init: function () {
        this.originalColor = this.el.getAttribute('color') || this.el.getObject3D('mesh').material.color.getHexString();
        this.originalScale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 };

        this.el.addEventListener('mouseenter', () => {
            this.el.setAttribute('material', 'emissive', this.data.hoverColor);
            this.el.setAttribute('material', 'emissiveIntensity', 0.4);
            // Slight pop out
            this.el.object3D.scale.set(this.originalScale.x * 1.05, this.originalScale.y * 1.05, this.originalScale.z * 1.05);
        });

        this.el.addEventListener('mouseleave', () => {
            this.el.setAttribute('material', 'emissive', '#000000');
            this.el.setAttribute('material', 'emissiveIntensity', 0);
            this.el.object3D.scale.set(this.originalScale.x, this.originalScale.y, this.originalScale.z);
        });

        this.el.classList.add('interactable');
    }
});

// Replaces standard HTML onclick for VR calibration button
AFRAME.registerComponent('calibrate-button', {
    init: function () {
        this.el.addEventListener('click', () => {
            if (window.calibrateSeatedHeight) window.calibrateSeatedHeight();
        });
    }
});
