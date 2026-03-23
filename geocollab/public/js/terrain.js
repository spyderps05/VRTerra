// MapLibre GL JS — open-source map engine for the VR briefing table
// Zero API keys required.

let mapTexture = null;
let mapInstance = null;

// ─── Pipe MapLibre canvas onto the A-Frame table plane ───
AFRAME.registerComponent('map-terrain', {
    tick: function () {
        if (!mapTexture) return;

        // Force MapLibre to constantly flush to WebGL canvas even if it thinks it's offscreen
        if (window.mapInstance) {
            window.mapInstance.triggerRepaint();
        }

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

// ─── Hand Tracking: Pinch to Interact ───
AFRAME.registerComponent('hand-map-controls', {
    init: function () {
        this.isPinching = false;
        this.pinchStartPos = new AFRAME.THREE.Vector3();
        this.mapStartCenter = null;
        this.mapStartZoom = 0;

        this.el.addEventListener('pinchstarted', (evt) => {
            if (!mapInstance) return;
            this.isPinching = true;
            this.pinchStartPos.copy(evt.detail.position);
            this.mapStartCenter = mapInstance.getCenter();
            this.mapStartZoom = mapInstance.getZoom();
        });

        this.el.addEventListener('pinchmoved', (evt) => {
            if (!this.isPinching || !mapInstance) return;
            const currentPos = evt.detail.position;
            const deltaX = currentPos.x - this.pinchStartPos.x;
            const deltaY = currentPos.y - this.pinchStartPos.y;
            const deltaZ = currentPos.z - this.pinchStartPos.z;

            // Get which hand this is attached to
            const handComponent = this.el.getAttribute('hand-tracking-controls');
            const hand = handComponent ? handComponent.hand : 'right';

            if (hand === 'right') {
                // Pinch and move up/down to zoom
                const zoomDelta = deltaY * 15; // 10cm movement = 1.5 zoom levels
                mapInstance.setZoom(this.mapStartZoom + zoomDelta);
                const label = document.querySelector('#zoom-label');
                if (label) label.setAttribute('value', 'Z:' + Math.round(mapInstance.getZoom()));
            } else if (hand === 'left') {
                // Pinch and move horizontally (X/Z) to pan
                const speed = 100 * Math.pow(2, 12 - mapInstance.getZoom()); // Adjust based on zoom
                mapInstance.setCenter([
                    this.mapStartCenter.lng - deltaX * speed,
                    this.mapStartCenter.lat - deltaZ * speed
                ]);
            }
        });

        this.el.addEventListener('pinchended', () => {
            this.isPinching = false;
        });
    }
});

// ─── Left thumbstick scrolls/pans the map ───
AFRAME.registerComponent('map-nav', {
    schema: { speed: { default: 0.003 } },
    init: function () {
        this.xAxis = 0;
        this.yAxis = 0;

        // Generic WebXR gamepad axis mapping
        this.el.addEventListener('axismove', (evt) => {
            if (evt.detail.axis && evt.detail.axis.length >= 2) {
                this.xAxis = evt.detail.axis[0];
                this.yAxis = evt.detail.axis[1];
            }
        });

        // Oculus-specific fallback
        this.el.addEventListener('thumbstickmoved', (evt) => {
            if (evt.detail.x !== undefined && evt.detail.y !== undefined) {
                this.xAxis = evt.detail.x;
                this.yAxis = evt.detail.y;
            }
        });

        // Grip button = zoom in, trigger = zoom out (left hand)
        this.el.addEventListener('gripdown', () => {
            if (mapInstance) {
                mapInstance.setZoom(mapInstance.getZoom() + 1);
                this.updateZoomLabel();
            }
        });

        this.el.addEventListener('triggerdown', () => {
            if (mapInstance) {
                mapInstance.setZoom(mapInstance.getZoom() - 1);
                this.updateZoomLabel();
            }
        });
    },
    updateZoomLabel: function () {
        const label = document.querySelector('#zoom-label');
        if (label && mapInstance) {
            label.setAttribute('value', 'Z:' + Math.round(mapInstance.getZoom()));
        }
    },
    tick: function () {
        if (!mapInstance) return;
        const deadzone = 0.15;
        let x = Math.abs(this.xAxis) > deadzone ? this.xAxis : 0;
        let y = Math.abs(this.yAxis) > deadzone ? this.yAxis : 0;
        if (x === 0 && y === 0) return;

        const zoom = mapInstance.getZoom();
        const speed = this.data.speed * Math.pow(2, 18 - zoom);
        const center = mapInstance.getCenter();
        mapInstance.setCenter([
            center.lng + x * speed,
            center.lat - y * speed
        ]);
    }
});

// ─── Zoom +/- buttons on table ───
AFRAME.registerComponent('map-zoom', {
    init: function () {
        // A-Frame laser-controls fire 'click' on trigger pull when intersecting
        this.el.addEventListener('click', () => {
            if (!mapInstance) return;
            if (this.el.id === 'btn-zoom-in') {
                mapInstance.setZoom(mapInstance.getZoom() + 1);
            } else if (this.el.id === 'btn-zoom-out') {
                mapInstance.setZoom(Math.max(1, mapInstance.getZoom() - 1));
            }
            const label = document.querySelector('#zoom-label');
            if (label) label.setAttribute('value', 'Z:' + Math.round(mapInstance.getZoom()));
        });
    }
});

// ─── DEM + Imagery sources (shared between boot and layer switch) ───
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

function buildStyle(imageryId, imageryTiles) {
    const sources = buildDemSources();
    sources[imageryId] = { type: 'raster', tiles: imageryTiles, tileSize: 256 };
    return {
        version: 8,
        sources: sources,
        layers: [
            { id: imageryId, type: 'raster', source: imageryId },
            { id: 'hillshade', type: 'hillshade', source: 'hillshadeSource', paint: { 'hillshade-shadow-color': '#000', 'hillshade-exaggeration': 0.6 } }
        ],
        terrain: { source: 'terrainSource', exaggeration: 5 }
    };
}

// ─── Layer switching buttons — uses 'click' event (fired by A-Frame raycaster) ───
AFRAME.registerComponent('layer-switcher', {
    init: function () {
        this.el.addEventListener('click', () => {
            if (!mapInstance) return;
            const id = this.el.id;
            let style;

            if (id === 'btn-osm') {
                style = buildStyle('osm', ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']);
            } else if (id === 'btn-esri') {
                style = buildStyle('esri', ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']);
            } else if (id === 'btn-carto') {
                style = buildStyle('carto', ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png']);
            }

            if (style) {
                mapInstance.setStyle(style);
                const chatPanel = document.querySelector('#chat-panel');
                if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                    chatPanel.components['canvas-ui-panel'].pushMessage('Layer → ' + id.replace('btn-', '').toUpperCase());
                }
            }
        });
    }
});

// ─── Boot MapLibre ───
document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'mapContainer';
    // IMPORTANT FIX: Let the map render normally in the DOM at full opacity.
    // The A-Frame WebGL canvas will overlay 100% on top of it because of its high zIndex.
    // This absolutely guarantees the Quest browser won't cull or throttle the map's WebGL context.
    container.style.position = 'absolute';
    container.style.top = '0px';
    container.style.left = '0px';
    container.style.width = '1416px';
    container.style.height = '1000px';
    container.style.zIndex = '1';
    document.body.appendChild(container);

    const initialStyle = buildStyle('osm', ['https://tile.openstreetmap.org/{z}/{x}/{y}.png']);

    mapInstance = new maplibregl.Map({
        container: container,
        style: initialStyle,
        center: [73.0479, 33.6844],   // Islamabad
        zoom: 12,
        pitch: 60,
        bearing: -20,
        preserveDrawingBuffer: true
    });

    mapInstance.on('load', () => {
        const canvas = mapInstance.getCanvas();
        mapTexture = new AFRAME.THREE.CanvasTexture(canvas);
        window.mapInstance = mapInstance;

        // Network sync
        if (typeof NAF !== 'undefined') {
            NAF.connection.subscribeToDataChannel('map-camera', (senderId, dataType, data) => {
                mapInstance.setCenter([data.lng, data.lat]);
                mapInstance.setZoom(data.zoom);
            });

            let lastCenter = { lng: 0, lat: 0 };
            setInterval(() => {
                if (NAF.connection.isConnected()) {
                    const c = mapInstance.getCenter();
                    if (Math.abs(c.lng - lastCenter.lng) > 0.0001 || Math.abs(c.lat - lastCenter.lat) > 0.0001) {
                        lastCenter = { lng: c.lng, lat: c.lat };
                        NAF.connection.broadcastData('map-camera', {
                            lng: c.lng, lat: c.lat, zoom: mapInstance.getZoom()
                        });
                    }
                }
            }, 200);
        }
    });
});
