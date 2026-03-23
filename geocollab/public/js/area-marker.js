/**
 * area-marker.js — Draw networked area polygons on the map surface
 * X button: add point | Y button: close polygon | hold for 0.5s: clear all
 */

AFRAME.registerComponent('area-marker', {
    init: function () {
        this.points = [];
        this.lines  = [];

        // X = add area point
        this.el.addEventListener('xbuttondown', () => {
            const raycaster = this.el.components.raycaster;
            if (!raycaster || !raycaster.intersections.length) return;

            const point = raycaster.intersections[0].point;
            this.points.push(new AFRAME.THREE.Vector3(point.x, point.y + 0.012, point.z));
            this._drawLine();

            // Dot marker at point
            const dot = document.createElement('a-sphere');
            dot.setAttribute('radius', '0.018');
            dot.setAttribute('position', `${point.x} ${point.y + 0.02} ${point.z}`);
            dot.setAttribute('color', '#ff8800');
            dot.setAttribute('material', 'shader: flat; emissive: #ff6600; emissiveIntensity: 2');
            this.el.sceneEl.appendChild(dot);
            this.lines.push(dot);

            if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                window.GeoCollab.postSystemMessage(`Area: ${this.points.length} point(s).`);
            }
        });

        // Y = close polygon
        this.el.addEventListener('ybuttondown', () => {
            if (this.points.length < 3) {
                if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                    window.GeoCollab.postSystemMessage('Need at least 3 points to close area.');
                }
                return;
            }
            // Close the loop
            const closingLine = document.createElement('a-entity');
            closingLine.setAttribute('line', {
                start: this.points[this.points.length - 1],
                end:   this.points[0],
                color: '#ff8800'
            });
            this.el.sceneEl.appendChild(closingLine);
            this.lines.push(closingLine);

            if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                window.GeoCollab.postSystemMessage(`Area marked (${this.points.length} pts).`);
            }

            // Reset for next area
            this.points = [];
            this.lines  = [];
        });
    },

    _drawLine: function () {
        if (this.points.length < 2) return;
        const line = document.createElement('a-entity');
        line.setAttribute('line', {
            start: this.points[this.points.length - 2],
            end:   this.points[this.points.length - 1],
            color: '#ff8800'
        });
        this.el.sceneEl.appendChild(line);
        this.lines.push(line);
    }
});
