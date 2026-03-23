/**
 * Canvas UI Panel component for A-Frame
 * Implements Learning 2 from Spatial_WebXR.
 * Draws high-res 2D text onto an offscreen canvas and applies it as a texture.
 */
AFRAME.registerComponent('canvas-ui-panel', {
    schema: {
        width: { type: 'number', default: 512 },
        height: { type: 'number', default: 768 },
        bgColor: { type: 'color', default: '#222222' },
        fontColor: { type: 'color', default: '#ffffff' },
        title: { type: 'string', default: '--- Chat Log ---' },
        messages: { type: 'array', default: ['System: Welcome to GeoCollab.'] }
    },

    init: function () {
        // Create an offscreen canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.data.width;
        this.canvas.height = this.data.height;
        this.ctx = this.canvas.getContext('2d');

        // Create CanvasTexture
        this.texture = new AFRAME.THREE.CanvasTexture(this.canvas);

        // Ensure the entity uses this canvas as its texture
        this.el.setAttribute('material', {
            shader: 'flat',
            src: this.canvas,
            transparent: true,
            opacity: 0.95
        });

        this.draw();
    },

    update: function () {
        this.draw();
    },

    draw: function () {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw rounded background
        ctx.fillStyle = this.data.bgColor;
        const radius = 20;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(w - radius, 0);
        ctx.quadraticCurveTo(w, 0, w, radius);
        ctx.lineTo(w, h - radius);
        ctx.quadraticCurveTo(w, h, w - radius, h);
        ctx.lineTo(radius, h);
        ctx.quadraticCurveTo(0, h, 0, h - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fill();

        // Draw Title
        ctx.fillStyle = this.data.fontColor;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.data.title, w / 2, 50);

        // Draw Divider
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(30, 75);
        ctx.lineTo(w - 30, 75);
        ctx.stroke();

        // Draw Messages
        ctx.font = '28px monospace';
        ctx.textAlign = 'left';
        let startY = 130;
        this.data.messages.forEach(msg => {
            // Color-code system messages
            if (msg.startsWith('System:')) {
                ctx.fillStyle = '#00ff00';
            } else {
                ctx.fillStyle = this.data.fontColor;
            }
            ctx.fillText(msg, 30, startY);
            startY += 40;
        });

        // Notify A-Frame/Three.js to update the texture on the GPU
        if (this.texture) {
            this.texture.needsUpdate = true;
        }
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.map) {
            mesh.material.map.needsUpdate = true;
        }
    },

    // Helper method accessible from other scripts to add a message dynamically
    pushMessage: function (msg) {
        this.data.messages.push(msg);
        // Keep only last 14 messages to fit in UI
        if (this.data.messages.length > 14) {
            this.data.messages.shift();
        }
        this.draw();
    }
});
