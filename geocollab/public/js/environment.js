/**
 * environment.js — Procedural grid floor and scene ambient setup
 */

AFRAME.registerComponent('scene-environment', {
    init: function () {
        // Nothing needed — handled below via DOMContentLoaded
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('#main-scene');
    if (!scene) return;

    scene.addEventListener('loaded', () => {
        buildGridFloor();
        buildAmbientParticles();
    });
});

/**
 * Creates a grid texture on a floor plane entity
 */
function buildGridFloor() {
    const floorEl = document.getElementById('grid-floor');
    if (!floorEl) return;

    // Create canvas texture
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark base
    ctx.fillStyle = '#03060f';
    ctx.fillRect(0, 0, size, size);

    // Minor grid lines (1m cells -> 12 cells across 12m room)
    const cells = 24;
    const cellPx = size / cells;

    ctx.strokeStyle = 'rgba(0, 55, 160, 0.18)';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= cells; i++) {
        const p = i * cellPx;
        ctx.beginPath(); ctx.moveTo(p, 0);    ctx.lineTo(p, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p);    ctx.lineTo(size, p); ctx.stroke();
    }

    // Major grid lines (every 4 cells)
    ctx.strokeStyle = 'rgba(0, 90, 210, 0.35)';
    ctx.lineWidth   = 2;
    for (let i = 0; i <= cells; i += 4) {
        const p = i * cellPx;
        ctx.beginPath(); ctx.moveTo(p, 0);    ctx.lineTo(p, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p);    ctx.lineTo(size, p); ctx.stroke();
    }

    // Center cross
    ctx.strokeStyle = 'rgba(0, 120, 255, 0.5)';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2); ctx.stroke();

    // Subtle radial gradient (brighter near centre)
    const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0,   'rgba(0, 50, 150, 0.10)');
    grd.addColorStop(0.6, 'rgba(0, 20, 80,  0.04)');
    grd.addColorStop(1,   'rgba(0, 0,  0,   0.00)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    // Apply as a plane
    const plane = document.createElement('a-plane');
    plane.setAttribute('width',    '22');
    plane.setAttribute('height',   '22');
    plane.setAttribute('rotation', '-90 0 0');
    plane.setAttribute('position', '0 0.001 0');
    plane.setAttribute('material', `
        shader: flat;
        src: ${canvas.toDataURL()};
        transparent: true;
        opacity: 1;
        repeat: 1 1;
    `);
    plane.setAttribute('shadow', 'receive: true');
    floorEl.appendChild(plane);
}

/**
 * Subtle floating particle system for atmosphere
 */
function buildAmbientParticles() {
    const scene = document.querySelector('#main-scene');
    if (!scene) return;

    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('a-sphere');
        const x  = (Math.random() - 0.5) * 18;
        const y  = 0.3 + Math.random() * 2.8;
        const z  = (Math.random() - 0.5) * 18;
        const r  = 0.008 + Math.random() * 0.012;
        const op = 0.15 + Math.random() * 0.35;

        particle.setAttribute('radius',   r);
        particle.setAttribute('position', `${x} ${y} ${z}`);
        particle.setAttribute('material', `shader: flat; color: #0066ff; opacity: ${op}; transparent: true`);

        // Animate with a subtle float
        const duration = 8000 + Math.random() * 12000;
        const dy       = 0.4 + Math.random() * 0.6;
        particle.setAttribute('animation', `
            property: position;
            dir: alternate;
            dur: ${duration};
            easing: easeInOutSine;
            loop: true;
            to: ${x} ${y + dy} ${z}
        `);

        scene.appendChild(particle);
    }
}
