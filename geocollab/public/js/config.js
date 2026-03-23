/**
 * GeoCollab Configuration
 * To deploy on Vercel: change socketURL to your Replit backend deployed URL.
 * Example: window.GeoCollab.socketURL = 'https://your-project.replit.app';
 */
window.GeoCollab = {
    socketURL: window.location.origin,
    defaultRoom: 'geocollab-room-1',
    defaultCenter: [73.0479, 33.6844],
    defaultZoom: 12,

    // Runtime state (managed by app.js)
    userState: {
        name: 'Operator',
        color: '#4CC3D9',
        room: 'geocollab-room-1'
    },
    activeTool: 'pointer',
    activeLayer: 'osm',
    userCount: 1,

    // Callbacks for cross-module communication
    onMapMove: null,
    onUserCountChange: null,
    onMicToggle: null,
    onLayerChange: null,
    onToolChange: null,
    onChatMessage: null
};
