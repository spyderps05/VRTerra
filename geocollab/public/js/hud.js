/**
 * hud.js — Tool guide canvas panel + 2D HUD wiring
 */

// ── Tool guide panel component ────────────────────────────────────────────────
AFRAME.registerComponent('tool-guide-panel', {
    init: function () {
        const W = 512, H = 768;

        this.canvas     = document.createElement('canvas');
        this.canvas.width  = W;
        this.canvas.height = H;
        this.ctx = this.canvas.getContext('2d');

        this.el.setAttribute('material', 'transparent', true);
        this.el.setAttribute('material', 'opacity', 0.96);

        const wireMesh = () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh && mesh.material) {
                mesh.material.map = new AFRAME.THREE.CanvasTexture(this.canvas);
                mesh.material.needsUpdate = true;
            } else {
                requestAnimationFrame(wireMesh);
            }
        };
        if (this.el.hasLoaded) wireMesh();
        else this.el.addEventListener('loaded', wireMesh);

        this._draw(W, H);
    },

    _draw: function (W, H) {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = 'rgba(4, 10, 30, 0.92)';
        this._roundRect(ctx, 0, 0, W, H, 18);
        ctx.fill();

        // Top accent
        ctx.fillStyle = '#0066ff';
        ctx.fillRect(0, 0, W, 4);
        ctx.fillStyle = 'rgba(0, 80, 200, 0.4)';
        ctx.fillRect(0, 0, 4, H);
        ctx.fillRect(W - 4, 0, 4, H);

        // Header
        ctx.fillStyle = '#0055cc';
        ctx.fillRect(0, 0, W, 56);
        ctx.font      = 'bold 22px "Courier New", monospace';
        ctx.fillStyle = '#88ccff';
        ctx.textAlign = 'left';
        ctx.fillText('◈ CONTROL GUIDE', 18, 34);

        // Divider
        ctx.strokeStyle = 'rgba(0, 80, 200, 0.5)';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(14, 58); ctx.lineTo(W - 14, 58); ctx.stroke();

        const controls = [
            { key: 'L-STICK',     action: 'Pan map',              cat: 'map'  },
            { key: 'L-GRIP (hold)', action: 'Open tool menu',     cat: 'tool' },
            { key: 'R-TRIGGER',   action: 'Drop pin',             cat: 'tool' },
            { key: 'B BUTTON',    action: 'Measure distance',     cat: 'tool' },
            { key: 'X BUTTON',    action: 'Mark area point',      cat: 'area' },
            { key: 'Y BUTTON',    action: 'Close area polygon',   cat: 'area' },
            { key: 'A BUTTON',    action: 'Mute / Unmute mic',    cat: 'voice'},
            { key: 'R-THUMBSTICK',action: 'Calibrate height',     cat: 'sys'  },
            { key: 'L-GRIP zoom', action: 'Zoom in',              cat: 'map'  },
            { key: 'L-TRIGGER',   action: 'Zoom out',             cat: 'map'  },
        ];

        const catColors = { map: '#44ccff', tool: '#ff4488', area: '#ff8800', voice: '#00ff88', sys: '#cc88ff' };

        let y = 88;
        controls.forEach((c, i) => {
            if (y > H - 60) return;

            // Row bg
            if (i % 2 === 0) {
                ctx.fillStyle = 'rgba(0, 30, 80, 0.2)';
                ctx.fillRect(8, y - 2, W - 16, 46);
            }

            // Category dot
            ctx.fillStyle = catColors[c.cat] || '#aaaaaa';
            ctx.beginPath(); ctx.arc(22, y + 18, 5, 0, Math.PI * 2); ctx.fill();

            // Key label
            ctx.fillStyle = catColors[c.cat] || '#aaaaaa';
            ctx.font      = 'bold 16px "Courier New", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(c.key, 36, y + 14);

            // Action
            ctx.fillStyle = '#7799bb';
            ctx.font      = '15px "Courier New", monospace';
            ctx.fillText(c.action, 36, y + 34);

            y += 60;
        });

        // Footer
        ctx.fillStyle = 'rgba(0, 40, 100, 0.5)';
        ctx.fillRect(0, H - 36, W, 36);
        ctx.font      = '13px "Courier New", monospace';
        ctx.fillStyle = '#334466';
        ctx.textAlign = 'left';
        ctx.fillText('Grip = hold to open tool wheel', 14, H - 12);

        if (this.el.getObject3D('mesh')) {
            const mesh = this.el.getObject3D('mesh');
            if (mesh.material && mesh.material.map) mesh.material.map.needsUpdate = true;
        }
    },

    _roundRect: function (ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
});
