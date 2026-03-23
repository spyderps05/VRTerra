/**
 * canvas-ui-panel.js — High-quality 2D canvas chat/log panel in A-Frame
 * Features: timestamps, color-coded types, user name colors, scrolling
 */

AFRAME.registerComponent('canvas-ui-panel', {
    schema: {
        width:     { type: 'number', default: 512 },
        height:    { type: 'number', default: 768 },
        maxLines:  { type: 'number', default: 16 }
    },

    init: function () {
        this.messages = [{ text: 'GeoCollab initialized.', type: 'system' }];

        this.canvas     = document.createElement('canvas');
        this.canvas.width  = this.data.width;
        this.canvas.height = this.data.height;
        this.ctx        = this.canvas.getContext('2d');

        this.texture    = new AFRAME.THREE.CanvasTexture(this.canvas);

        // Set base material attributes; map will be wired in once mesh is ready
        this.el.setAttribute('material', 'transparent', true);
        this.el.setAttribute('material', 'opacity', 0.97);

        // Wire canvas texture to mesh once available
        const wireMesh = () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh && mesh.material) {
                mesh.material.map = this.texture;
                mesh.material.needsUpdate = true;
            } else {
                requestAnimationFrame(wireMesh);
            }
        };
        if (this.el.hasLoaded) wireMesh();
        else this.el.addEventListener('loaded', wireMesh);

        this.draw();
    },

    /**
     * Push a new message.
     * @param {string|object} msg — plain string or { text, type, color }
     *   type: 'system' | 'chat' | 'warn' | 'info'
     *   color: optional hex string for chat messages
     */
    pushMessage: function (msg) {
        if (typeof msg === 'string') {
            msg = { text: msg, type: 'system' };
        }
        this.messages.push(msg);
        if (this.messages.length > this.data.maxLines) {
            this.messages.shift();
        }
        this.draw();
    },

    draw: function () {
        const ctx = this.ctx;
        const W   = this.canvas.width;
        const H   = this.canvas.height;

        // ── Background ────────────────────────────────────────
        ctx.clearRect(0, 0, W, H);

        // Rounded panel background
        this._roundRect(ctx, 0, 0, W, H, 18, '#050d1f', 0.94);

        // Top border accent
        ctx.fillStyle = '#0066ff';
        ctx.fillRect(0, 0, W, 4);

        // Side accent
        ctx.fillStyle = 'rgba(0, 80, 200, 0.4)';
        ctx.fillRect(0, 0, 4, H);
        ctx.fillRect(W - 4, 0, 4, H);

        // ── Header ────────────────────────────────────────────
        ctx.fillStyle = '#0055cc';
        ctx.fillRect(0, 0, W, 56);

        // Header text
        ctx.font      = 'bold 22px "Courier New", monospace';
        ctx.fillStyle = '#88ccff';
        ctx.textAlign = 'left';
        ctx.fillText('◈ TACTICAL LOG', 18, 34);

        // Message count badge
        const count = this.messages.length;
        ctx.fillStyle = 'rgba(0, 100, 200, 0.6)';
        this._roundRect(ctx, W - 70, 14, 54, 28, 6, 'rgba(0, 100, 200, 0.6)', 1);
        ctx.font      = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = '#4499ff';
        ctx.textAlign = 'center';
        ctx.fillText(`${count}`, W - 43, 33);

        // Divider
        ctx.strokeStyle = 'rgba(0, 80, 200, 0.5)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(14, 58); ctx.lineTo(W - 14, 58);
        ctx.stroke();

        // ── Messages ──────────────────────────────────────────
        const lineH    = 40;
        const startY   = 80;
        const maxWidth = W - 32;

        ctx.textAlign = 'left';

        this.messages.forEach((msg, idx) => {
            const y = startY + idx * lineH;
            if (y + lineH > H - 20) return;

            // Row background (alternating)
            if (idx % 2 === 0) {
                ctx.fillStyle = 'rgba(0, 30, 80, 0.2)';
                ctx.fillRect(8, y - 18, W - 16, lineH - 2);
            }

            // Color by message type
            let color;
            switch (msg.type) {
                case 'system': color = '#00dd88'; break;
                case 'warn':   color = '#ffaa00'; break;
                case 'info':   color = '#88aaff'; break;
                case 'chat':
                    color = msg.color || '#e0f0ff';
                    break;
                default:       color = '#aaccee'; break;
            }

            // Type indicator dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(20, y - 4, 4, 0, Math.PI * 2);
            ctx.fill();

            // Message text
            ctx.fillStyle = color;
            ctx.font      = '18px "Courier New", monospace';

            const text = msg.text || '';
            // Truncate if too long
            let display = text;
            while (ctx.measureText(display).width > maxWidth - 30 && display.length > 0) {
                display = display.slice(0, -1);
            }
            if (display.length < text.length) display += '…';

            ctx.fillText(display, 32, y);
        });

        // ── Bottom status bar ─────────────────────────────────
        ctx.fillStyle = 'rgba(0, 40, 100, 0.5)';
        ctx.fillRect(0, H - 36, W, 36);

        ctx.font      = '14px "Courier New", monospace';
        ctx.fillStyle = '#334466';
        ctx.textAlign = 'left';
        ctx.fillText('Press T to type a message', 14, H - 12);

        // ── Flush GPU texture ─────────────────────────────────
        if (this.texture) this.texture.needsUpdate = true;
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.map) {
            mesh.material.map.needsUpdate = true;
        }
    },

    _roundRect: function (ctx, x, y, w, h, r, fill, alpha) {
        ctx.globalAlpha = alpha !== undefined ? alpha : 1;
        ctx.fillStyle   = fill;
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
        ctx.fill();
        ctx.globalAlpha = 1;
    }
});
