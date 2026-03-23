/**
 * Advanced Laser component for A-Frame
 * Implements Learning 3 from Spatial_WebXR: custom laser colors and intersection reticles.
 */
AFRAME.registerComponent('advanced-laser', {
    schema: {
        activeColor: { type: 'color', default: '#00ff00' },
        defaultColor: { type: 'color', default: '#ffffff' }
    },

    init: function () {
        this.raycasterEl = this.el;

        // Create the reticle ring in the scene
        this.reticle = document.createElement('a-entity');
        this.reticle.setAttribute('geometry', 'primitive: ring; radiusInner: 0.02; radiusOuter: 0.03');
        this.reticle.setAttribute('material', `color: ${this.data.activeColor}; shader: flat; transparent: true; opacity: 0.8`);
        this.reticle.setAttribute('visible', false);
        this.el.sceneEl.appendChild(this.reticle);

        // Bind event listeners
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);

        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
    },

    onIntersection: function (evt) {
        const els = evt.detail.els;
        if (els.length > 0) {
            // Change laser line color when hitting an object
            this.el.setAttribute('raycaster', 'lineColor', this.data.activeColor);
            this.reticle.setAttribute('visible', true);
        }
    },

    onIntersectionCleared: function (evt) {
        // Revert laser line to default
        this.el.setAttribute('raycaster', 'lineColor', this.data.defaultColor);
        this.reticle.setAttribute('visible', false);
    },

    tick: function () {
        if (this.reticle.getAttribute('visible')) {
            const raycaster = this.el.components.raycaster;
            if (raycaster && raycaster.intersectedEls.length > 0) {
                // Find the closest intersection
                const intersection = raycaster.getIntersection(raycaster.intersectedEls[0]);
                if (intersection) {
                    // Snap the reticle strictly slightly above the intersected face to avoid Z-fighting
                    this.reticle.setAttribute('position', intersection.point);

                    // Calculate surface normal in world space to properly flatten the ring against the surface
                    const normal = intersection.face.normal.clone();
                    normal.transformDirection(intersection.object.matrixWorld).normalize();

                    const target = new AFRAME.THREE.Vector3().addVectors(intersection.point, normal);
                    this.reticle.object3D.lookAt(target);
                }
            } else {
                this.reticle.setAttribute('visible', false);
            }
        }
    },

    remove: function () {
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        if (this.reticle && this.reticle.parentNode) {
            this.reticle.parentNode.removeChild(this.reticle);
        }
    }
});
