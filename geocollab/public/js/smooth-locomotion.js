/**
 * smooth-locomotion.js — Camera-relative movement with collision detection
 * Left thumbstick drives movement; vignette reduces motion sickness
 */

AFRAME.registerComponent('smooth-locomotion', {
    schema: {
        speed:             { type: 'number', default: 2.0 },
        colliderClass:     { type: 'string', default: '.collidable' },
        collisionDistance: { type: 'number', default: 0.5 }
    },

    init: function () {
        this.direction = new AFRAME.THREE.Vector3();
        this.xAxis     = 0;
        this.yAxis     = 0;
        this.rig       = this.el.sceneEl.querySelector('#player');
        this.camera    = this.el.sceneEl.querySelector('[camera]');
        this.raycaster = new AFRAME.THREE.Raycaster();
        this.collidableMeshes = [];

        this.el.addEventListener('axismove', (evt) => {
            if (evt.detail.axis && evt.detail.axis.length >= 2) {
                this.xAxis = evt.detail.axis[0];
                this.yAxis = evt.detail.axis[1];
            }
        });

        const cacheCollidables = () => {
            this.collidableMeshes = [];
            this.el.sceneEl.querySelectorAll(this.data.colliderClass).forEach(el => {
                if (el.object3D) {
                    el.object3D.traverse(node => {
                        if (node.isMesh) this.collidableMeshes.push(node);
                    });
                }
            });
        };

        if (this.el.sceneEl.hasLoaded) cacheCollidables();
        else this.el.sceneEl.addEventListener('loaded', cacheCollidables);

        // Vignette ring for motion comfort
        this.vignette = document.createElement('a-torus');
        this.vignette.setAttribute('radius',        '0.25');
        this.vignette.setAttribute('radius-tubular', '0.1');
        this.vignette.setAttribute('color',          '#000000');
        this.vignette.setAttribute('material',       'transparent: true; opacity: 0; shader: flat');
        this.vignette.setAttribute('position',       '0 0 -0.3');

        const attachVignette = () => {
            this.camera = this.el.sceneEl.querySelector('[camera]');
            if (this.camera) this.camera.appendChild(this.vignette);
        };
        if (this.camera) this.camera.appendChild(this.vignette);
        else this.el.sceneEl.addEventListener('camera-set-active', attachVignette);
    },

    tick: function (time, dt) {
        if (!this.rig || !this.camera) return;
        const dz = 0.10;
        const x  = Math.abs(this.xAxis) > dz ? this.xAxis : 0;
        const y  = Math.abs(this.yAxis) > dz ? this.yAxis : 0;

        if (x === 0 && y === 0) {
            if (this.vignette) this.vignette.setAttribute('material', 'opacity', 0);
            return;
        }

        // Camera-relative direction
        const q = new AFRAME.THREE.Quaternion();
        this.camera.object3D.getWorldQuaternion(q);
        const euler = new AFRAME.THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(q);
        this.direction.set(x, 0, y);
        this.direction.applyAxisAngle(new AFRAME.THREE.Vector3(0, 1, 0), euler.y);
        this.direction.normalize();

        // Collision detection
        let canMove = true;
        if (this.collidableMeshes.length) {
            const origin = new AFRAME.THREE.Vector3();
            this.camera.object3D.getWorldPosition(origin);
            origin.y -= 0.4;
            this.raycaster.set(origin, this.direction);
            const hits = this.raycaster.intersectObjects(this.collidableMeshes, false);
            if (hits.length && hits[0].distance < this.data.collisionDistance) {
                if (Math.abs(hits[0].face.normal.y) < 0.5) canMove = false;
            }
        }

        if (canMove) {
            const dist = this.data.speed * (dt / 1000);
            this.rig.object3D.position.addScaledVector(this.direction, dist);
            if (this.vignette) this.vignette.setAttribute('material', 'opacity', 0.7);
        }
    }
});
