# WebXR GeoCollab — Tactical Operations Platform

## Project Overview
A collaborative, multi-user WebXR geo-visualization app built with:
- **Backend**: Node.js + Express + Socket.io (port 5000)
- **Frontend**: A-Frame 1.6 WebXR + Networked-AFrame 0.12 (NAF)
- **Map**: MapLibre GL 4.1 rendered to an A-Frame table canvas texture
- **Geo**: Turf.js for spatial calculations
- **Deployment**: Replit VM (dev) + Vercel (static/full-stack) supported

## Architecture

```
geocollab/
├── server.js            — Express + Socket.io server (HTTP, port 5000)
├── vercel.json          — Vercel full-stack deployment config
├── package.json
└── public/
    ├── index.html       — Full A-Frame scene + lobby + HUD overlays
    ├── css/
    │   └── ui.css       — Tactical dark theme for lobby, HUD, non-VR mode
    └── js/
        ├── config.js        — Global config (socketURL, defaultCenter/zoom)
        ├── app.js           — Lobby flow, NAF init, chat, keyboard shortcuts
        ├── environment.js   — Procedural grid floor texture, ambient particles
        ├── avatar.js        — Full-body avatar component with voice ring
        ├── voice.js         — Mic toggle, AudioContext voice activity detection
        ├── terrain.js       — MapLibre → A-Frame texture, map-nav, layer-switcher
        ├── map-tools.js     — Pin dropper, measure tool, radial tool menu
        ├── canvas-ui-panel.js — Canvas-rendered tactical log / chat panel
        ├── hud.js           — Tool guide canvas panel component
        ├── polish.js        — ui-button hover/press, snap-turn, seated calibration
        ├── area-marker.js   — X/Y button polygon area drawing
        ├── advanced-laser.js — Raycaster reticle/colour switching
        └── smooth-locomotion.js — Camera-relative WASD movement with collision
```

## Key Design Decisions

### NAF Dynamic Initialization
`networked-scene` is NOT in the HTML. It is set dynamically in `app.js` when the user clicks "Enter Operations Center", allowing the room name and socket URL to be customised at runtime.

### Canvas Map Texture
MapLibre renders to an off-screen 2048×1440 px hidden div. `map-terrain` component copies the canvas to a Three.js `CanvasTexture` every frame and applies it to the briefing-table `a-plane`.

### Vercel Deployment
`geocollab/vercel.json` routes everything through `server.js` via `@vercel/node`. For pure static hosting (e.g. Vercel + separate backend), update `window.GeoCollab.socketURL` in `config.js`.

### Socket URL Configuration
Set `window.GeoCollab.socketURL` in `public/js/config.js`. Defaults to `window.location.origin` (same-origin, works on Replit). Change to your deployed Replit URL for Vercel deployment.

### UI Button Event Wiring
`ui-button` component adds `.interactable` to its child `a-box` (the actual mesh), forwarding `mouseenter/mouseleave/click` to the parent entity where `layer-switcher`, `map-zoom`, etc. listen.

### Voice Activity
`voice-toggle` component on `#player` runs an `AudioContext` analyser per tick. When average frequency crosses threshold, it broadcasts via NAF data channel. `avatar.js` listens for `remoteVoiceActivity` CustomEvent to toggle the voice ring.

## Controller Layout (Quest 2/3)
| Button | Action |
|--------|--------|
| L-Thumbstick | Pan map |
| L-Grip (hold) | Open radial tool menu (thumbstick to select) |
| R-Trigger | Drop pin annotation |
| B | Measure distance (2 clicks) |
| X | Add area polygon point |
| Y | Close area polygon |
| A | Toggle microphone mute |
| R-Thumbstick | Calibrate seated height |

## Keyboard Shortcuts (Desktop)
| Key | Action |
|-----|--------|
| T | Open text chat bar |
| M | Toggle 2D map overlay |
| Esc | Close chat / return to lobby |

## Running
Workflow: `cd geocollab && node server.js`
URL: `http://0.0.0.0:5000`
