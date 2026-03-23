/**
 * advanced-laser.js — Laser pointer with intersection reticle
 * Changes colour and shows a ring reticle when intersecting .interactable elements
 */

AFRAME.registerComponent('advanced-laser', {
    schema: {
        activeColor:  { type: 'color', default: '#00ff00' },
        defaultColor: { type: 'color', default: '#ffffff' }
    },

    init: function () {
        // Reticle ring — use a-torus (ring geometry) instead of a-ring for compat
        this.reticle = document.createElement('a-torus');
        this.reticle.setAttribute('radius',         '0.023');
        this.reticle.setAttribute('radius-tubular',  '0.006');
        this.reticle.setAttribute('segments-tubular','8');
        this.reticle.setAttribute('color', this.data.activeColor);
        this.reticle.setAttribute('material',
            `shader: flat; color: ${this.data.activeColor}; transparent: true; opacity: 0.85`);
        this.reticle.setAttribute('visible', false);
        this.el.sceneEl.appendChild(this.reticle);

        this._onHit     = this._onHit.bind(this);
        this._onCleared = this._onCleared.bind(this);
        this.el.addEventListener('raycaster-intersection',         this._onHit);
        this.el.addEventListener('raycaster-intersection-cleared', this._onCleared);
    },

    _onHit: function (evt) {
        if (evt.detail.els.length > 0) {
            this.el.setAttribute('raycaster', 'lineColor', this.data.activeColor);
            this.reticle.setAttribute('visible', true);
        }
    },

    _onCleared: function () {
        this.el.setAttribute('raycaster', 'lineColor', this.data.defaultColor);
        this.reticle.setAttribute('visible', false);
    },

    tick: function () {
        if (!this.reticle.getAttribute('visible')) return;
        const raycaster = this.el.components.raycaster;
        if (!raycaster || !raycaster.intersectedEls.length) {
            this.reticle.setAttribute('visible', false);
            return;
        }
        const hit = raycaster.getIntersection(raycaster.intersectedEls[0]);
        if (!hit) return;

        this.reticle.setAttribute('position', hit.point);

        const normal = hit.face.normal.clone()
            .transformDirection(hit.object.matrixWorld)
            .normalize();
        const target = new AFRAME.THREE.Vector3().addVectors(hit.point, normal);
        this.reticle.object3D.lookAt(target);
    },

    remove: function () {
        this.el.removeEventListener('raycaster-intersection',         this._onHit);
        this.el.removeEventListener('raycaster-intersection-cleared', this._onCleared);
        if (this.reticle && this.reticle.parentNode) {
            this.reticle.parentNode.removeChild(this.reticle);
        }
    }
});
