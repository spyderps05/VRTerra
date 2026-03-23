/**
 * Smooth Locomotion component with boundary collision detection
 * Adapted from Spatial_WebXR learnings to A-Frame.
 */
AFRAME.registerComponent('smooth-locomotion', {
    schema: {
        speed: { type: 'number', default: 2.0 },
        colliderClass: { type: 'string', default: '.collidable' },
        collisionDistance: { type: 'number', default: 0.5 }
    },

    init: function () {
        this.direction = new AFRAME.THREE.Vector3();
        this.xAxis = 0;
        this.yAxis = 0;
        this.rig = this.el.sceneEl.querySelector('#player');
        this.camera = this.el.sceneEl.querySelector('[camera]');

        // Internal raycaster for collision detection
        this.raycaster = new AFRAME.THREE.Raycaster();
        this.collidableMeshes = [];

        // Capture thumbstick input from the VR controller
        this.el.addEventListener('axismove', (evt) => {
            this.xAxis = evt.detail.axis[0];
            this.yAxis = evt.detail.axis[1];
        });

        // Cache collidable meshes to save performance
        this.updateCollidables = () => {
            this.collidableMeshes = [];
            const collidableEls = this.el.sceneEl.querySelectorAll(this.data.colliderClass);
            collidableEls.forEach(el => {
                if (el.object3D) {
                    el.object3D.traverse(node => {
                        if (node.isMesh) this.collidableMeshes.push(node);
                    });
                }
            });
        };

        // Update collidables once the scene loads completely
        if (this.el.sceneEl.hasLoaded) {
            this.updateCollidables();
        } else {
            this.el.sceneEl.addEventListener('loaded', this.updateCollidables);
        }

        // Add a vignette ring to the camera to prevent motion sickness
        this.vignette = document.createElement('a-torus');
        this.vignette.setAttribute('radius', '0.25');
        this.vignette.setAttribute('radius-tubular', '0.1');
        this.vignette.setAttribute('color', 'black');
        this.vignette.setAttribute('material', 'transparent: true; opacity: 0; shader: flat');
        this.vignette.setAttribute('position', '0 0 -0.3'); // Just in front of camera

        // Wait till camera is ready to append
        if (this.camera) {
            this.camera.appendChild(this.vignette);
        } else {
            this.el.sceneEl.addEventListener('camera-set-active', () => {
                this.camera = this.el.sceneEl.querySelector('[camera]');
                this.camera.appendChild(this.vignette);
            });
        }
    },

    tick: function (time, timeDelta) {
        if (!this.rig || !this.camera) return;

        // Apply deadzone to thumbstick input to prevent accidental drift
        const deadzone = 0.1;
        let x = Math.abs(this.xAxis) > deadzone ? this.xAxis : 0;
        let y = Math.abs(this.yAxis) > deadzone ? this.yAxis : 0;

        if (x === 0 && y === 0) return;

        // Calculate movement direction relative to camera's yaw (where user is looking)
        const quaternion = new AFRAME.THREE.Quaternion();
        this.camera.object3D.getWorldQuaternion(quaternion);
        const euler = new AFRAME.THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(quaternion);

        // Set direction based on X/Y thumbstick input and rotate by camera yaw
        this.direction.set(x, 0, y);
        this.direction.applyAxisAngle(new AFRAME.THREE.Vector3(0, 1, 0), euler.y);
        this.direction.normalize();

        let canMove = true;

        // Collision detection check
        if (this.collidableMeshes.length > 0) {
            const origin = new AFRAME.THREE.Vector3();
            this.camera.object3D.getWorldPosition(origin);

            // Raycast from chest level (camera height - 0.4 meters) to prevent casting over small objects
            origin.y -= 0.4;

            this.raycaster.set(origin, this.direction);
            const intersects = this.raycaster.intersectObjects(this.collidableMeshes, false);

            // If we hit an object and the distance is less than our threshold, block movement.
            if (intersects.length > 0 && intersects[0].distance < this.data.collisionDistance) {
                // Only block if the geometric face we hit is mostly vertical (e.g., walls/tables, not floors)
                if (Math.abs(intersects[0].face.normal.y) < 0.5) {
                    canMove = false;
                }
            }
        }

        if (canMove) {
            const distance = this.data.speed * (timeDelta / 1000);
            this.rig.object3D.position.addScaledVector(this.direction, distance);

            // Show vignette when moving
            if (this.vignette) {
                this.vignette.setAttribute('material', 'opacity', 0.8);
            }
        }
    }
});
