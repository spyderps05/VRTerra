/**
 * polish.js — VR comfort features: hover effects, snap-turn, seated calibration, presence events
 */

// ── Presence events ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF === 'undefined') return;

    document.body.addEventListener('clientDisconnected', () => {
        if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
            window.GeoCollab.postSystemMessage('Operator left the room.');
        }
    });

    document.body.addEventListener('clientConnected', () => {
        if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
            window.GeoCollab.postSystemMessage('Operator joined the room.');
        }
    });
});

// ── ui-button — hover highlight + press animation ─────────────────────────────
AFRAME.registerComponent('ui-button', {
    schema: {
        hoverColor: { type: 'color', default: '#ffeb3b' }
    },

    init: function () {
        // The actual visual is the first child a-box
        this.bg = this.el.querySelector('a-box');

        // Make child a-box interactable so the raycaster hits it,
        // and forward its events to the parent entity where other components listen
        if (this.bg) {
            this.bg.classList.add('interactable');
            ['mouseenter', 'mouseleave', 'click'].forEach(evtName => {
                this.bg.addEventListener(evtName, (e) => {
                    this.el.emit(evtName, e.detail, false);
                });
            });
        }

        // Also keep parent interactable for look-based cursor fallback
        this.el.classList.add('interactable');

        // Hover / press handlers on parent (fired by forwarded events above)
        this.el.addEventListener('mouseenter', () => {
            if (this.bg) {
                this.bg.setAttribute('material', 'emissive',          this.data.hoverColor);
                this.bg.setAttribute('material', 'emissiveIntensity', 0.6);
            }
            this.el.object3D.scale.set(1.05, 1.05, 1.05);
        });

        this.el.addEventListener('mouseleave', () => {
            if (this.bg) {
                this.bg.setAttribute('material', 'emissive',          '#000000');
                this.bg.setAttribute('material', 'emissiveIntensity', 0);
            }
            this.el.object3D.scale.set(1, 1, 1);
        });

        this.el.addEventListener('click', () => {
            this.el.object3D.scale.set(0.93, 0.93, 0.93);
            setTimeout(() => this.el.object3D.scale.set(1.05, 1.05, 1.05), 100);
        });
    }
});

// ── calibrate-button ──────────────────────────────────────────────────────────
AFRAME.registerComponent('calibrate-button', {
    init: function () {
        this.el.addEventListener('click', () => {
            if (window.calibrateSeatedHeight) window.calibrateSeatedHeight();
        });
    }
});

// ── snap-turn — right thumbstick rotates rig in 45° increments ───────────────
AFRAME.registerComponent('snap-turn', {
    schema: { turnAngle: { type: 'number', default: 45 } },
    init: function () {
        this.canTurn = true;
        this.el.addEventListener('axismove', (evt) => {
            const rig = this.el.sceneEl.querySelector('#player');
            if (!rig || !this.canTurn) return;

            const x = evt.detail.axis ? evt.detail.axis[0] : 0;
            if (Math.abs(x) > 0.8) {
                const dir = x > 0 ? -1 : 1;
                rig.object3D.rotation.y += dir * AFRAME.THREE.MathUtils.degToRad(this.data.turnAngle);
                this.canTurn = false;
                setTimeout(() => this.canTurn = true, 500);
            }
        });
    }
});

// ── seated-mode — calibrate eye height above table ───────────────────────────
AFRAME.registerComponent('seated-mode', {
    init: function () {
        const calibrate = () => {
            const rig    = this.el;
            const camera = this.el.querySelector('[camera]');
            if (!rig || !camera) return;
            const localY = camera.object3D.position.y;
            // Aim for eyes at ~0.95m above ground (just above 0.63m table)
            rig.object3D.position.y = 0.95 - localY;
            if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                window.GeoCollab.postSystemMessage('Seated height calibrated.');
            }
        };

        this.el.sceneEl.addEventListener('thumbstickdown', calibrate);
        this.el.sceneEl.addEventListener('xbuttondown',   calibrate);
        this.el.sceneEl.addEventListener('ybuttondown',   calibrate);
        window.calibrateSeatedHeight = calibrate;
    }
});

// ── terrain-loading-ui ────────────────────────────────────────────────────────
AFRAME.registerComponent('terrain-loading-ui', {
    init: function () {
        const txt = document.createElement('a-text');
        txt.setAttribute('value',    'Loading terrain…');
        txt.setAttribute('position', '0 1.2 0.5');
        txt.setAttribute('scale',    '0.5 0.5 0.5');
        txt.setAttribute('align',    'center');
        txt.setAttribute('color',    '#ffaa00');
        this.el.appendChild(txt);

        this.el.addEventListener('loaded', () => {
            setTimeout(() => {
                if (this.el.contains(txt)) this.el.removeChild(txt);
            }, 2500);
        });
    }
});
