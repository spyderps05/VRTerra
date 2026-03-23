// Defines the networked schema for the pin
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF !== 'undefined') {
        NAF.schemas.add({
            template: '#pin-template',
            components: [
                'position',
                'rotation'
            ]
        });
    }
});

// Sync Laser Pointer
AFRAME.registerComponent('sync-laser', {
    init: function () {
        // Rely on index.html raycaster attribute to avoid A-Frame initialization race conditions
        this.el.setAttribute('laser-controls', 'hand: right');
    }
});

// Annotation Pin Dropper
AFRAME.registerComponent('pin-dropper', {
    init: function () {
        this.el.addEventListener('triggerdown', () => {
            const raycaster = this.el.components.raycaster;
            if (raycaster) {
                const intersection = raycaster.getIntersection(document.querySelector('#briefing-table'));
                if (intersection) {
                    // Create networked pin at the intersection point + minor offset so it rests on the table
                    const position = intersection.point;

                    let entity = document.createElement('a-entity');
                    entity.setAttribute('networked', 'template:#pin-template; networkId:' + AFRAME.THREE.MathUtils.generateUUID());
                    entity.setAttribute('position', position);

                    document.querySelector('a-scene').appendChild(entity);
                }
            }
        });
    }
});

// Measurement Tool — geo-aware using Turf.js
AFRAME.registerComponent('measure-tool', {
    init: function () {
        this.points = [];
        this.lineEntity = null;
        this.labelEntity = null;

        this.el.addEventListener('bbuttondown', this.triggerMeasurement.bind(this));
    },

    // Convert VR table hit point to approximate lat/lng based on map bounds
    vrToGeo: function (vrPoint) {
        if (!window.mapInstance) return null;
        const mapSurface = document.querySelector('#map-surface');
        if (!mapSurface) return null;

        // Map surface dimensions (from index.html)
        const tableW = 3.4;
        const tableH = 2.4;
        const tablePos = mapSurface.getAttribute('position');

        // Normalize hit position relative to table center (-0.5 to 0.5)
        const normX = (vrPoint.x - tablePos.x) / tableW;
        const normZ = (vrPoint.z - tablePos.z) / tableH;

        // MapLibre bounds
        const bounds = window.mapInstance.getBounds();
        const lng = bounds.getWest() + (normX + 0.5) * (bounds.getEast() - bounds.getWest());
        const lat = bounds.getNorth() - (normZ + 0.5) * (bounds.getNorth() - bounds.getSouth());

        return [lng, lat];
    },

    triggerMeasurement: function () {
        const chatPanel = document.querySelector('#chat-panel');
        if (chatPanel && chatPanel.components['canvas-ui-panel']) {
            chatPanel.components['canvas-ui-panel'].pushMessage('System: Measure Action Triggered');
        }

        const raycaster = this.el.components.raycaster;
        if (raycaster && raycaster.intersections.length > 0) {
            const point = raycaster.intersections[0].point;
            this.points.push(new AFRAME.THREE.Vector3(point.x, point.y, point.z));

            if (this.points.length === 1) {
                if (this.lineEntity && this.lineEntity.parentNode) {
                    this.lineEntity.parentNode.removeChild(this.lineEntity);
                }
                if (this.labelEntity && this.labelEntity.parentNode) {
                    this.labelEntity.parentNode.removeChild(this.labelEntity);
                }
                this.lineEntity = document.createElement('a-entity');
                this.el.sceneEl.appendChild(this.lineEntity);
            } else if (this.points.length === 2) {
                const p1 = this.points[0];
                const p2 = this.points[1];

                // Draw line
                this.lineEntity.setAttribute('line', { start: p1, end: p2, color: '#ffff00' });

                // Compute real-world distance using Turf.js
                let distanceText;
                const geo1 = this.vrToGeo(p1);
                const geo2 = this.vrToGeo(p2);

                if (geo1 && geo2 && typeof turf !== 'undefined') {
                    const from = turf.point(geo1);
                    const to = turf.point(geo2);
                    const dist = turf.distance(from, to, { units: 'kilometers' });
                    if (dist < 1) {
                        distanceText = (dist * 1000).toFixed(0) + ' m';
                    } else {
                        distanceText = dist.toFixed(2) + ' km';
                    }
                } else {
                    distanceText = p1.distanceTo(p2).toFixed(2) + ' m (VR)';
                }

                // Label
                this.labelEntity = document.createElement('a-text');
                this.labelEntity.setAttribute('value', distanceText);
                this.labelEntity.setAttribute('align', 'center');
                this.labelEntity.setAttribute('color', '#ffff00');
                this.labelEntity.setAttribute('scale', '0.4 0.4 0.4');

                const mid = new AFRAME.THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                mid.y += 0.15;
                this.labelEntity.setAttribute('position', mid);
                this.el.sceneEl.appendChild(this.labelEntity);

                this.points = [];

                const chatPanel = document.querySelector('#chat-panel');
                if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                    chatPanel.components['canvas-ui-panel'].pushMessage('Measured: ' + distanceText);
                }
            }
        }
    }
});
