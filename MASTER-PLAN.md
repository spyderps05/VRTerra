# WebXR GeoCollab — Master Implementation Plan

> Multi-User VR Terrain Collaboration on Meta Quest 3
> Synthesized from: `@brainstorming`, `@vr-ar`, `@3d-web-experience`, `@threejs-fundamentals`, `@threejs-interaction`, `@nodejs-backend-patterns`, `@architecture`, `@test-driven-development`, `@systematic-debugging`

---

## Understanding Summary

- **What**: A local-network, browser-based WebXR application where 3–4 Meta Quest 3 headsets share a collaborative VR space for viewing GIS terrain data.
- **Why**: Enable real-time collaborative terrain briefings without native app installs, cloud dependencies, or recurring costs.
- **Who**: Small military/GIS teams needing secure, air-gapped collaborative terrain visualization.
- **Constraints**: 100% local network, zero internet, WebGL 2.0 only (no WebGPU on Quest), 90 FPS VR target, 8 GB shared RAM on Quest 3.
- **Non-goals**: Public internet deployment, native Quest apps, >4 concurrent headsets, mobile phone support.

---

## Architecture Decision Record

| Decision | Choice | Why | Alternatives Considered |
|----------|--------|-----|------------------------|
| XR Runtime | WebXR API (Horizon OS Browser) | Zero install on headsets, 1M+ monthly users | Unity/Unreal native (too complex) |
| 3D Framework | A-Frame 1.6+ (Three.js) | HTML-declarative, vast ecosystem, VR-ready | Raw Three.js (too low-level), Babylon.js |
| Multiplayer | Networked A-Frame (NAF) | Purpose-built for multi-user VR | Custom WebSocket (reinventing the wheel) |
| Terrain | CesiumJS + Quantized Mesh tiles | Apache-2.0, offline-capable, proven | Mapbox (cloud-only), custom mesh |
| HTTPS | mkcert local CA | One-time setup, 2-year certs | Self-signed (browser warnings) |
| Server | Node.js + Express | Single process serves everything | Python (weaker WebSocket support) |
| Voice | NAF built-in WebRTC | Zero extra setup, spatial audio | Jitsi (overkill for 4 users) |

---

## Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| XR Runtime | WebXR API (Quest Horizon OS Browser) | ✅ Production |
| 3D Framework | A-Frame 1.6+ / Three.js | ✅ Production |
| Multiplayer | Networked A-Frame + Socket.IO | ✅ Production |
| Terrain Rendering | CesiumJS 1.118+ | ✅ Production |
| Terrain Processing | CTB Docker (tum-gis/ctb-quantized-mesh) | ⚙️ Setup Required |
| Local HTTPS | mkcert + Node HTTPS | ✅ Production |
| Web Server | Node.js + Express | ✅ Production |
| Voice Chat | NAF WebRTC (built-in) | ✅ Production |
| Colocation | Quest Shared Spaces (Horizon OS v39+) | 🧪 Experimental |

---

## Complete To-Do List

### Phase 0 — Environment Setup (Day 1–2)
- [ ] Install Node.js 20.x on server PC
- [ ] Install mkcert and generate local CA
- [ ] Generate HTTPS cert for server's LAN IP
- [ ] Export rootCA.crt for Quest headsets
- [ ] Install Docker (for terrain processing later)
- [ ] Create project structure: `~/geocollab/{public,certs,terrain_tiles,logs}`
- [ ] `npm init -y && npm install express socket.io naf-nodejs-server cors`
- [ ] Write `server.js` with HTTPS + static file serving
- [ ] Test server access from PC browser at `https://<LAN_IP>`

### Phase 1 — Single Headset WebXR Test (Day 3–5)
- [ ] Enable Developer Mode on Quest 3
- [ ] Install rootCA.crt on Quest via ADB push
- [ ] Create minimal A-Frame WebXR scene (`public/index.html`)
- [ ] Add `<a-scene>` with basic environment (sky, ground, lights)
- [ ] Test: Quest opens `https://<LAN_IP>` → browser loads page
- [ ] Test: "Enter VR" button → VR mode enters successfully
- [ ] Test: Controller tracking works (ray from hand)
- [ ] Test: Head tracking (6DOF) is smooth
- [ ] Verify 72–90 FPS in VR (no judder)
- [ ] **GATE: One headset can enter VR via browser over LAN HTTPS**

### Phase 2 — Multi-User Room (Day 6–10)
- [ ] Set up `naf-nodejs-server` on WSS (port 3000)
- [ ] Add NAF to A-Frame scene with `networked-scene` component
- [ ] Design avatar template: head sphere + hand entities + nametag
- [ ] Configure NAF room: `geocollab-room-1`
- [ ] Enable WebRTC voice chat: `audio: true`
- [ ] Install rootCA.crt on 2nd and 3rd Quest headsets
- [ ] Test: 3 headsets join same room
- [ ] Test: Avatars visible to each other (position/rotation synced)
- [ ] Test: Spatial voice chat works (proximity-based volume)
- [ ] Test: Mic permission prompt handled gracefully
- [ ] Build shared environment: briefing table, north indicator, ambient lighting
- [ ] Add VR comfort settings: snap turn, vignette during locomotion
- [ ] **GATE: 3 headsets in shared VR space with voice chat**

### Phase 3 — GIS Map Layer (Day 11–15)
- [ ] Export AOI map from QGIS as 4K PNG
- [ ] Apply PNG as texture to `<a-plane>` entity (the "map table")
- [ ] Add grid overlay with coordinate labels
- [ ] Add north arrow indicator
- [ ] Implement synced laser pointer (networked A-Frame entity)
- [ ] Implement annotation pin system (drop pin with label, synced)
- [ ] Add text chat panel (2D overlay in VR for quick comms)
- [ ] Test: All users see the same map
- [ ] Test: Laser pointers visible to all users in real-time
- [ ] Test: Annotation pins persist and sync across all headsets
- [ ] **GATE: Collaborative map briefing works for 3 users**

### Phase 4 — 3D Terrain with CesiumJS (Day 16–25)
- [ ] Prepare DEM data: reproject GeoTIFF to EPSG:4326 with GDAL
- [ ] Run CTB Docker pipeline: GeoTIFF → Quantized Mesh tiles
- [ ] Verify tile output: `layer.json` + z/x/y directory structure
- [ ] Add terrain tile static route in Express: `/terrain/`
- [ ] Integrate CesiumJS into WebXR scene (off-screen canvas → texture approach)
- [ ] Configure CesiumJS terrain provider to point to local tile server
- [ ] Implement synchronized Cesium camera (broadcast position via Socket.IO)
- [ ] Add fly-through navigation controls for VR
- [ ] Add UAV/drone flight path overlay (GeoJSON → Cesium entity)
- [ ] Implement measurement tool (distance between two points on terrain)
- [ ] Optimize: set `maximumScreenSpaceError: 4`, limit zoom to level 12
- [ ] Performance test: verify 72+ FPS with terrain loaded on Quest 3
- [ ] **GATE: Multi-user terrain fly-through with measurement tools**

### Phase 5 — Polish & Hardening (Day 26+)
- [ ] Auto-start server on PC boot (pm2 or systemd)
- [ ] Add area marking tool on terrain
- [ ] Add screenshot capture from inside VR
- [ ] Add session recording / replay system
- [ ] Implement VR comfort settings: vignette, locomotion speed, seated mode
- [ ] Display room-scale guardian boundaries in VR
- [ ] Add loading progress indicator for terrain tiles
- [ ] Handle graceful disconnection/reconnection of headsets
- [ ] Write operational guide for non-developer users
- [ ] **GATE: System can be used by non-developers for real briefings**

---

## Known Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| CesiumJS + WebXR integration | 🔴 HIGH | Use off-screen canvas → WebXR texture; Phase 1–3 avoid entirely |
| Quest browser audio permissions | 🟡 MED | Add "Mic Permission" button before VR entry |
| Large tile performance on Quest | 🟡 MED | Limit zoom level 12, set `maximumScreenSpaceError: 4` |
| WebRTC on local network | 🟡 MED | Use WebSocket adapter instead of WebRTC for higher reliability |
| No WebGPU on Quest | 🟢 LOW | Use WebGL 2.0 (fully supported and adequate) |
| Shared Spaces experimental | 🟢 LOW | Optional feature; NAF syncs avatars without it |

---

## VR Comfort Guidelines (from @vr-ar)

| Principle | Implementation |
|-----------|---------------|
| Maintain 90 FPS | Profile with Quest browser DevTools, LOD terrain |
| Prevent motion sickness | Teleport locomotion, snap turn, vignette |
| 1 unit = 1 meter | All A-Frame entities use real-world scale |
| Readable text | Minimum 0.4 scale text, high contrast colors |
| Depth cues | Shadows on terrain table, ambient occlusion |
| Seated vs standing | Support both modes with height calibration |

---

## Three.js Performance Budget (from @threejs-fundamentals)

| Metric | Target | Notes |
|--------|--------|-------|
| Draw calls | < 100 | Merge static geometries, use instancing |
| Polygon count | < 500K total | Use LOD for terrain, simple avatar meshes |
| Texture memory | < 256 MB | Compress textures with WebP, limit 4K to map only |
| Frame time | < 11.11ms | 90 FPS = 11.11ms budget per frame |
| Pixel ratio | 1.0 on Quest | Don't exceed device pixel ratio |

---

## Project Structure

```
geocollab/
├── server.js                 # HTTPS + NAF signaling + terrain routing
├── package.json
├── certs/
│   ├── 192.168.x.x+2.pem    # Server cert
│   ├── 192.168.x.x+2-key.pem # Server key
│   └── rootCA.crt            # CA root for Quest headsets
├── public/
│   ├── index.html            # Main WebXR A-Frame scene
│   ├── js/
│   │   ├── app.js            # Scene logic, VR entry
│   │   ├── avatar.js         # Avatar template + sync
│   │   ├── map-tools.js      # Laser pointer, annotations, measurement
│   │   ├── terrain.js        # CesiumJS integration (Phase 4)
│   │   └── voice.js          # WebRTC voice setup
│   ├── assets/
│   │   ├── map-texture.png   # AOI map from QGIS
│   │   └── avatar-model.glb  # Avatar 3D model
│   └── css/
│       └── ui.css            # VR overlay UI styles
├── terrain_tiles/            # Quantized Mesh tiles (generated offline)
│   ├── layer.json
│   └── {z}/{x}/{y}.terrain
├── dem_data/                 # Source GeoTIFF DEMs
└── logs/
```

---

## Skill Sources

This plan synthesizes knowledge from these installed Antigravity skills:

| Skill | Contribution |
|-------|-------------|
| `@brainstorming` | Structured design process: understand → lock → design → validate |
| `@vr-ar` | VR comfort, 90 FPS target, Quest 3 specs, interaction patterns |
| `@3d-web-experience` | Three.js stack selection, model pipeline, performance budgets |
| `@threejs-fundamentals` | Scene setup, cameras, renderers, LOD, geometry merging |
| `@threejs-interaction` | Raycasting, controller input, laser pointer implementation |
| `@nodejs-backend-patterns` | Express HTTPS server, WebSocket signaling, static file serving |
| `@architecture` | ADR documentation, trade-off analysis, simplicity principle |
| `@test-driven-development` | Phase gate testing strategy, systematic validation |
| `@systematic-debugging` | WebRTC troubleshooting, HTTPS cert debugging methodology |
