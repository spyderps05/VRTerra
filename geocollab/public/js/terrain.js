/**
 * terrain.js — MapLibre map rendered to A-Frame table texture
 *   • Higher resolution canvas (2048×1440)
 *   • Coordinate & zoom HUD updates
 *   • Scale bar sync
 *   • Smooth layer transitions
 *   • Networked map sync via NAF
 */

let mapTexture  = null;
let mapInstance = null;

// ── Pipe MapLibre canvas → A-Frame table plane ────────────────────────────────
AFRAME.registerComponent('map-terrain', {
    tick: function () {
        if (!mapTexture || !window.mapInstance) return;
        window.mapInstance.triggerRepaint();

        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material) {
            if (mesh.material.map !== mapTexture) {
                mesh.material.map = mapTexture;
            }
            mesh.material.needsUpdate = true;
        }
        mapTexture.needsUpdate = true;
    }
});

// ── Pinch-to-zoom / pan (hand tracking) ──────────────────────────────────────
AFRAME.registerComponent('hand-map-controls', {
    init: function () {
        this.isPinching     = false;
        this.pinchStartPos  = new AFRAME.THREE.Vector3();
        this.mapStartCenter = null;
        this.mapStartZoom   = 0;

        this.el.addEventListener('pinchstarted', (evt) => {
            if (!mapInstance) return;
            this.isPinching = true;
            this.pinchStartPos.copy(evt.detail.position);
            this.mapStartCenter = mapInstance.getCenter();
            this.mapStartZoom   = mapInstance.getZoom();
        });

        this.el.addEventListener('pinchmoved', (evt) => {
            if (!this.isPinching || !mapInstance) return;
            const cur    = evt.detail.position;
            const deltaX = cur.x - this.pinchStartPos.x;
            const deltaY = cur.y - this.pinchStartPos.y;
            const deltaZ = cur.z - this.pinchStartPos.z;
            const hand   = (this.el.getAttribute('hand-tracking-controls') || {}).hand || 'right';

            if (hand === 'right') {
                mapInstance.setZoom(this.mapStartZoom + deltaY * 15);
                updateZoomLabel(mapInstance.getZoom());
            } else {
                const speed = 100 * Math.pow(2, 12 - mapInstance.getZoom());
                mapInstance.setCenter([
                    this.mapStartCenter.lng - deltaX * speed,
                    this.mapStartCenter.lat - deltaZ * speed
                ]);
            }
        });

        this.el.addEventListener('pinchended', () => { this.isPinching = false; });
    }
});

// ── Left thumbstick pans the map ──────────────────────────────────────────────
AFRAME.registerComponent('map-nav', {
    schema: { speed: { default: 0.003 } },

    init: function () {
        this.xAxis = 0;
        this.yAxis = 0;

        this.el.addEventListener('axismove', (evt) => {
            if (evt.detail.axis && evt.detail.axis.length >= 2) {
                this.xAxis = evt.detail.axis[0];
                this.yAxis = evt.detail.axis[1];
            }
        });

        this.el.addEventListener('thumbstickmoved', (evt) => {
            if (evt.detail.x !== undefined) {
                this.xAxis = evt.detail.x;
                this.yAxis = evt.detail.y;
            }
        });

        // Grip = zoom in, trigger = zoom out (left hand)
        this.el.addEventListener('gripdown', () => {
            if (!mapInstance) return;
            mapInstance.setZoom(mapInstance.getZoom() + 1);
            updateZoomLabel(mapInstance.getZoom());
        });

        this.el.addEventListener('triggerdown', () => {
            if (!mapInstance) return;
            mapInstance.setZoom(Math.max(1, mapInstance.getZoom() - 1));
            updateZoomLabel(mapInstance.getZoom());
        });
    },

    tick: function () {
        if (!mapInstance) return;
        const dz = 0.15;
        const x  = Math.abs(this.xAxis) > dz ? this.xAxis : 0;
        const y  = Math.abs(this.yAxis) > dz ? this.yAxis : 0;
        if (x === 0 && y === 0) return;

        const zoom  = mapInstance.getZoom();
        const speed = this.data.speed * Math.pow(2, 18 - zoom);
        const c     = mapInstance.getCenter();
        mapInstance.setCenter([c.lng + x * speed, c.lat - y * speed]);
    }
});

// ── Zoom +/- buttons ──────────────────────────────────────────────────────────
AFRAME.registerComponent('map-zoom', {
    init: function () {
        this.el.addEventListener('click', () => {
            if (!mapInstance) return;
            const id = this.el.id;
            if (id === 'btn-zoom-in') {
                mapInstance.setZoom(Math.min(18, mapInstance.getZoom() + 1));
            } else {
                mapInstance.setZoom(Math.max(1, mapInstance.getZoom() - 1));
            }
            updateZoomLabel(mapInstance.getZoom());
        });
    }
});

// ── Active-layer indicator ────────────────────────────────────────────────────
function setActiveDashboardLayer(activeId) {
    const ids = ['btn-osm', 'btn-esri', 'btn-carto'];
    ids.forEach(id => {
        const el  = document.getElementById(id);
        if (!el) return;
        const bar = el.querySelector('.btn-active-bar');
        if (bar) bar.setAttribute('visible', id === activeId);
    });
    const names = { 'btn-osm': 'OSM', 'btn-esri': 'SAT', 'btn-carto': 'DARK' };
    const layerEl = document.getElementById('hud-layer');
    if (layerEl) layerEl.textContent = names[activeId] || '--';
    if (window.GeoCollab) window.GeoCollab.activeLayer = activeId;
}

// ── Map style builder ─────────────────────────────────────────────────────────
function buildDemSources() {
    return {
        terrainSource: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256, encoding: 'terrarium', maxzoom: 15
        },
        hillshadeSource: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256, encoding: 'terrarium', maxzoom: 15
        }
    };
}

function buildStyle(id, tiles) {
    const sources = buildDemSources();
    sources[id] = { type: 'raster', tiles, tileSize: 256 };
    return {
        version: 8, sources,
        layers: [
            { id, type: 'raster', source: id },
            {
                id: 'hillshade', type: 'hillshade', source: 'hillshadeSource',
                paint: { 'hillshade-shadow-color': '#000', 'hillshade-exaggeration': 0.5 }
            }
        ],
        terrain: { source: 'terrainSource', exaggeration: 4 }
    };
}

// ── Layer switcher ────────────────────────────────────────────────────────────
AFRAME.registerComponent('layer-switcher', {
    init: function () {
        this.el.addEventListener('click', () => {
            if (!mapInstance) return;
            const id = this.el.id;
            const styles = {
                'btn-osm':   buildStyle('osm',   ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']),
                'btn-esri':  buildStyle('esri',  ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']),
                'btn-carto': buildStyle('carto', ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'])
            };
            if (styles[id]) {
                mapInstance.setStyle(styles[id]);
                setActiveDashboardLayer(id);
                const names = { 'btn-osm': 'OpenStreetMap', 'btn-esri': 'Satellite', 'btn-carto': 'Dark Mode' };
                if (window.GeoCollab && window.GeoCollab.postSystemMessage) {
                    window.GeoCollab.postSystemMessage(`Layer: ${names[id]}`);
                }
            }
        });
    }
});

// ── Zoom label + HUD updater ──────────────────────────────────────────────────
function updateZoomLabel(z) {
    const rounded = Math.round(z);
    const labelEl = document.getElementById('zoom-label');
    if (labelEl) labelEl.setAttribute('value', `ZOOM: ${rounded}`);
    const hudEl = document.getElementById('hud-zoom');
    if (hudEl) hudEl.textContent = rounded;

    // Update scale bar (rough approx — 1 tile at zoom z ≈ 156km)
    updateScaleBar(z);
}

function updateScaleBar(zoom) {
    // Approximate metres per pixel at equator
    const mPerPx  = 156543 * Math.cos(33.6844 * Math.PI / 180) / Math.pow(2, zoom);
    // Scale bar is 0.45m wide in 3D = 0.45 * mPerPx metres (1 table metre = ~1km at default zoom)
    // Simplified: just show a round distance
    const tableWidthMetres = 3.4;
    const zoomFactor = Math.pow(2, 12 - zoom);
    let distM = 1000 * zoomFactor; // rough 1km at z12

    let label;
    if (distM >= 1000) {
        label = `${(distM / 1000).toFixed(0)} km`;
    } else {
        label = `${Math.round(distM)} m`;
    }

    const scaleEl = document.getElementById('scale-label');
    if (scaleEl) scaleEl.setAttribute('value', label);
}

// ── Update coordinate HUD ─────────────────────────────────────────────────────
function updateCoordHUD(center) {
    const latEl = document.getElementById('hud-lat');
    const lngEl = document.getElementById('hud-lng');
    if (latEl) latEl.textContent = center.lat.toFixed(4);
    if (lngEl) lngEl.textContent = center.lng.toFixed(4);
    if (window.GeoCollab && window.GeoCollab.onMapMove) {
        window.GeoCollab.onMapMove(center.lat, center.lng, mapInstance ? mapInstance.getZoom() : 12);
    }
}

// ── Boot MapLibre ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Higher-res container
    const container = document.createElement('div');
    container.id = 'mapLibreContainer';
    Object.assign(container.style, {
        position: 'absolute',
        top: '0', left: '0',
        width: '2048px', height: '1440px',
        zIndex: '1',
        visibility: 'hidden'  // hidden from page — only used as WebGL texture
    });
    document.body.appendChild(container);

    const center = (window.GeoCollab && window.GeoCollab.defaultCenter) || [73.0479, 33.6844];
    const zoom   = (window.GeoCollab && window.GeoCollab.defaultZoom)   || 12;

    mapInstance = new maplibregl.Map({
        container,
        style: buildStyle('osm', ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']),
        center,
        zoom,
        pitch: 55,
        bearing: -15,
        preserveDrawingBuffer: true
    });

    mapInstance.on('load', () => {
        const canvas = mapInstance.getCanvas();
        mapTexture   = new AFRAME.THREE.CanvasTexture(canvas);
        window.mapInstance = mapInstance;

        updateZoomLabel(zoom);
        setActiveDashboardLayer('btn-osm');

        // Coordinate HUD
        mapInstance.on('move', () => updateCoordHUD(mapInstance.getCenter()));
        mapInstance.on('zoom', () => updateZoomLabel(mapInstance.getZoom()));

        // NAF map sync
        if (typeof NAF !== 'undefined') {
            NAF.connection.subscribeToDataChannel('map-camera', (senderId, type, data) => {
                mapInstance.setCenter([data.lng, data.lat]);
                mapInstance.setZoom(data.zoom);
            });

            let lastLng = 0, lastLat = 0;
            setInterval(() => {
                if (typeof NAF !== 'undefined' && NAF.connection && NAF.connection.isConnected()) {
                    const c = mapInstance.getCenter();
                    if (Math.abs(c.lng - lastLng) > 0.0001 || Math.abs(c.lat - lastLat) > 0.0001) {
                        lastLng = c.lng; lastLat = c.lat;
                        NAF.connection.broadcastData('map-camera', {
                            lng: c.lng, lat: c.lat, zoom: mapInstance.getZoom()
                        });
                    }
                }
            }, 250);
        }
    });
});
