# WebXR GeoCollab

A collaborative WebXR geo-visualization application for tactical operations. Multiple users can join a shared 3D room and interact with map layers, drop pins, measure areas, and communicate via voice.

## Architecture

- **Backend**: Node.js + Express + Socket.io (`geocollab/server.js`)
- **Frontend**: Static HTML/JS served by Express (`geocollab/public/`)
  - A-Frame (WebXR framework)
  - Networked-Aframe (multi-user sync)
  - MapLibre GL (2D map rendering)
  - Turf.js (geospatial analysis)
- **Port**: 5000

## Running

The app runs as a single Node.js server that serves both the static frontend and the Socket.io signaling backend.

```
cd geocollab && node server.js
```

## Key Files

- `geocollab/server.js` - HTTP server with Socket.io room management
- `geocollab/public/index.html` - WebXR scene definition
- `geocollab/public/js/` - Component scripts (app, avatar, voice, map-tools, terrain, etc.)
- `geocollab/public/css/ui.css` - UI overlay styles

## Notes

- Originally designed to run with HTTPS (self-signed certs for Quest headsets). Modified to use HTTP since Replit handles TLS via its proxy.
- WebRTC voice audio requires HTTPS in production — works when deployed via Replit's `.replit.app` domain.
- Deployment: VM target (required for persistent WebSocket/Socket.io state).
