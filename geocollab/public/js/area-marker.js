/**
 * Area Marking Tool
 * Allows drawing a polygon on the terrain to mark specific areas.
 */
AFRAME.registerComponent('area-marker', {
    init: function () {
        this.points = [];
        this.lines = [];

        // Listen to X button for adding points
        this.el.addEventListener('xbuttondown', () => {
            const raycaster = this.el.components.raycaster;
            if (raycaster && raycaster.intersections.length > 0) {
                const point = raycaster.intersections[0].point;
                this.points.push(new AFRAME.THREE.Vector3(point.x, point.y + 0.05, point.z)); // slightly above surface
                this.drawLine();
            }
        });

        // Listen to Y button to close polygon and clear
        this.el.addEventListener('ybuttondown', () => {
            if (this.points.length > 2) {
                // close polygon by connecting last point to first
                const line = document.createElement('a-entity');
                line.setAttribute('line', {
                    start: this.points[this.points.length - 1],
                    end: this.points[0],
                    color: 'orange'
                });
                this.el.sceneEl.appendChild(line);
                this.lines.push(line);

                // Keep the drawn area, start a new one
                this.points = [];
                this.lines = [];

                const chatPanel = document.querySelector('#chat-panel');
                if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                    chatPanel.components['canvas-ui-panel'].pushMessage('System: Area Marked.');
                }
            }
        });
    },
    drawLine: function () {
        if (this.points.length > 1) {
            const line = document.createElement('a-entity');
            line.setAttribute('line', {
                start: this.points[this.points.length - 2],
                end: this.points[this.points.length - 1],
                color: 'orange'
            });
            this.el.sceneEl.appendChild(line);
            this.lines.push(line);
        }
    }
});
