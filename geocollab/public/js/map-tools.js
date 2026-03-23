/**
 * map-tools.js — Annotation tools: pin dropper, measure tool, radial tool menu
 */

// ── NAF Schema for networked pins ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF !== 'undefined') {
        NAF.schemas.add({
            template: '#pin-template',
            components: ['position', 'rotation']
        });
    }
});

// ── Active tool state ─────────────────────────────────────────────────────────
const TOOLS = { POINTER: 'POINTER', PIN: 'PIN', MEASURE: 'MEASURE', AREA: 'AREA', ERASE: 'ERASE' };
window._activeTool = TOOLS.POINTER;

function setActiveTool(tool) {
    window._activeTool = tool;
    if (window.GeoCollab) window.GeoCollab.activeTool = tool;
    const el = document.getElementById('hud-tool');
    if (el) el.textContent = tool;
    if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
        window.GeoCollab.postSystemMessage(`Tool: ${tool}`);
    }
}

// ── Annotation Pin Dropper ────────────────────────────────────────────────────
AFRAME.registerComponent('pin-dropper', {
    init: function () {
        this._droppedPins = [];

        this.el.addEventListener('triggerdown', () => {
            if (window._activeTool !== TOOLS.POINTER && window._activeTool !== TOOLS.PIN) return;

            const raycaster = this.el.components.raycaster;
            if (!raycaster) return;

            // Try briefing table first, then map surface
            const targets = [
                document.querySelector('#briefing-table'),
                document.querySelector('#map-surface')
            ].filter(Boolean);

            let hit = null;
            for (const t of targets) {
                const i = raycaster.getIntersection(t);
                if (i) { hit = i; break; }
            }

            if (hit) {
                const pos = {
                    x: hit.point.x,
                    y: hit.point.y + 0.01,
                    z: hit.point.z
                };
                const pin = document.createElement('a-entity');
                pin.setAttribute('networked',
                    `template:#pin-template; networkId:${AFRAME.THREE.MathUtils.generateUUID()}`);
                pin.setAttribute('position', pos);
                document.querySelector('a-scene').appendChild(pin);
                this._droppedPins.push(pin);

                if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                    window.GeoCollab.postSystemMessage('Pin dropped.');
                }
            }
        });
    }
});

// ── Measurement Tool ──────────────────────────────────────────────────────────
AFRAME.registerComponent('measure-tool', {
    init: function () {
        this.points      = [];
        this.lineEntity  = null;
        this.labelEntity = null;

        this.el.addEventListener('bbuttondown', this._onMeasure.bind(this));
    },

    _vrToGeo: function (vrPoint) {
        if (!window.mapInstance) return null;
        const mapSurface = document.querySelector('#map-surface');
        if (!mapSurface) return null;

        const W = 3.4, H = 2.4;
        const pos = mapSurface.getAttribute('position');
        const normX =  (vrPoint.x - pos.x) / W;
        const normZ =  (vrPoint.z - pos.z) / H;

        const bounds = window.mapInstance.getBounds();
        const lng = bounds.getWest() + (normX + 0.5) * (bounds.getEast() - bounds.getWest());
        const lat = bounds.getNorth() - (normZ + 0.5) * (bounds.getNorth() - bounds.getSouth());
        return [lng, lat];
    },

    _onMeasure: function () {
        const raycaster = this.el.components.raycaster;
        if (!raycaster || !raycaster.intersections.length) return;

        const point = raycaster.intersections[0].point;
        this.points.push(new AFRAME.THREE.Vector3(point.x, point.y, point.z));

        if (this.points.length === 1) {
            // Start new measurement — clear old visuals
            [this.lineEntity, this.labelEntity].forEach(e => {
                if (e && e.parentNode) e.parentNode.removeChild(e);
            });
            this.lineEntity = document.createElement('a-entity');
            this.el.sceneEl.appendChild(this.lineEntity);

            if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                window.GeoCollab.postSystemMessage('Measure: first point set.');
            }
        } else if (this.points.length === 2) {
            const [p1, p2] = this.points;

            // Draw line
            this.lineEntity.setAttribute('line', {
                start: p1, end: p2, color: '#ffee00'
            });

            // Calculate geo distance
            let distText;
            const g1 = this._vrToGeo(p1);
            const g2 = this._vrToGeo(p2);
            if (g1 && g2 && typeof turf !== 'undefined') {
                const dist = turf.distance(turf.point(g1), turf.point(g2), { units: 'kilometers' });
                distText = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(2)} km`;
            } else {
                distText = `${p1.distanceTo(p2).toFixed(2)} m (VR)`;
            }

            // Label at midpoint
            const mid = new AFRAME.THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            mid.y += 0.18;
            this.labelEntity = document.createElement('a-text');
            this.labelEntity.setAttribute('value', distText);
            this.labelEntity.setAttribute('align', 'center');
            this.labelEntity.setAttribute('color', '#ffee00');
            this.labelEntity.setAttribute('scale', '0.45 0.45 0.45');
            this.labelEntity.setAttribute('position', mid);
            this.el.sceneEl.appendChild(this.labelEntity);

            if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                window.GeoCollab.postSystemMessage(`Distance: ${distText}`);
            }

            this.points = [];
        }
    }
});

// ── Radial Tool Menu ──────────────────────────────────────────────────────────
AFRAME.registerComponent('tool-radial-menu', {
    init: function () {
        this.menuOpen  = false;
        this.menuItems = [];
        this.selected  = -1;
        this._thumbX   = 0;
        this._thumbY   = 0;

        const MENU_TOOLS = [
            { tool: TOOLS.POINTER, label: '✦ POINTER', color: '#00ccff' },
            { tool: TOOLS.PIN,     label: '⬤ PIN',     color: '#ff2244' },
            { tool: TOOLS.MEASURE, label: '⟺ MEASURE', color: '#ffee00' },
            { tool: TOOLS.AREA,    label: '◻ AREA',    color: '#ff8800' },
            { tool: TOOLS.ERASE,   label: '✕ ERASE',   color: '#cc44ff' }
        ];

        const scene = this.el.sceneEl;

        // Open menu on left grip hold
        this.el.addEventListener('gripdown', () => {
            if (this.menuOpen) return;
            this.menuOpen = true;
            this._buildMenu(MENU_TOOLS, scene);
        });

        // Close on grip release — select highlighted tool
        this.el.addEventListener('gripup', () => {
            if (!this.menuOpen) return;
            this.menuOpen = false;
            if (this.selected >= 0 && this.selected < MENU_TOOLS.length) {
                setActiveTool(MENU_TOOLS[this.selected].tool);
            }
            this._destroyMenu(scene);
            this.selected = -1;
        });

        // Thumbstick selects item
        this.el.addEventListener('thumbstickmoved', (evt) => {
            if (!this.menuOpen) return;
            this._thumbX = evt.detail.x || 0;
            this._thumbY = evt.detail.y || 0;
            this._updateSelection(MENU_TOOLS.length);
        });

        this.el.addEventListener('axismove', (evt) => {
            if (!this.menuOpen || !evt.detail.axis) return;
            this._thumbX = evt.detail.axis[0] || 0;
            this._thumbY = evt.detail.axis[1] || 0;
            this._updateSelection(MENU_TOOLS.length);
        });
    },

    _buildMenu: function (tools, scene) {
        const handPos = this.el.object3D.getWorldPosition(new AFRAME.THREE.Vector3());
        const radius  = 0.28;

        this.menuItems = tools.map((t, i) => {
            const angle = (i / tools.length) * 2 * Math.PI - Math.PI / 2;
            const x = handPos.x + radius * Math.cos(angle);
            const y = handPos.y + 0.05;
            const z = handPos.z + radius * Math.sin(angle);

            const item = document.createElement('a-entity');

            const bg = document.createElement('a-plane');
            bg.setAttribute('width',  '0.22');
            bg.setAttribute('height', '0.08');
            bg.setAttribute('color',  '#0a1428');
            bg.setAttribute('material', `
                shader: flat; color: #080e20; opacity: 0.9; transparent: true;
                emissive: ${t.color}; emissiveIntensity: 0.2
            `);

            const label = document.createElement('a-text');
            label.setAttribute('value',  t.label);
            label.setAttribute('align',  'center');
            label.setAttribute('color',  t.color);
            label.setAttribute('scale',  '0.4 0.4 0.4');
            label.setAttribute('position', '0 0 0.01');

            item.appendChild(bg);
            item.appendChild(label);
            item.setAttribute('position', `${x} ${y} ${z}`);
            item.setAttribute('look-at',  '[camera]');
            scene.appendChild(item);

            return { el: item, bg, label, color: t.color };
        });
    },

    _updateSelection: function (count) {
        if (!this.menuItems.length) return;
        const mag = Math.sqrt(this._thumbX ** 2 + this._thumbY ** 2);
        if (mag < 0.3) { this.selected = -1; this._highlightAll(false); return; }

        const angle = Math.atan2(this._thumbY, this._thumbX) + Math.PI / 2;
        const norm  = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        this.selected = Math.round((norm / (2 * Math.PI)) * count) % count;
        this._highlightAll(false);
        this._highlight(this.selected, true);
    },

    _highlightAll: function (active) {
        this.menuItems.forEach(item => this._highlight(this.menuItems.indexOf(item), active));
    },

    _highlight: function (idx, active) {
        const item = this.menuItems[idx];
        if (!item) return;
        item.bg.setAttribute('material',
            `shader: flat; color: ${active ? item.color : '#080e20'}; opacity: ${active ? 1 : 0.85};
             transparent: true; emissive: ${item.color}; emissiveIntensity: ${active ? 1.5 : 0.2}`);
        item.el.object3D.scale.setScalar(active ? 1.15 : 1.0);
    },

    _destroyMenu: function (scene) {
        this.menuItems.forEach(item => {
            if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
        });
        this.menuItems = [];
    }
});
