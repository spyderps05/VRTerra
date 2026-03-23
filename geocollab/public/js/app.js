/**
 * app.js — Main application controller
 * Handles: lobby, user state, NAF initialization, chat, keyboard shortcuts, non-VR mode
 */

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM refs ──────────────────────────────────────────────
    const lobbyOverlay  = document.getElementById('lobby-overlay');
    const hudOverlay    = document.getElementById('hud-overlay');
    const nonvrOverlay  = document.getElementById('nonvr-overlay');
    const usernameInput = document.getElementById('username-input');
    const colorPicker   = document.getElementById('color-picker');
    const roomSelector  = document.getElementById('room-selector');
    const enterBtn      = document.getElementById('enter-btn');
    const statusDot     = document.getElementById('status-dot');
    const statusText    = document.getElementById('conn-status-text');
    const chatBar       = document.getElementById('hud-chat-bar');
    const chatInput     = document.getElementById('chat-input');
    const chatSendBtn   = document.getElementById('chat-send-btn');
    const nonvrBackBtn  = document.getElementById('nonvr-back-btn');

    // ── User state defaults ────────────────────────────────────
    const state = window.GeoCollab.userState;
    state.name  = 'Operator';
    state.color = '#4CC3D9';
    state.room  = 'geocollab-room-1';

    // ── Socket connection for raw chat / user info ─────────────
    let socket = null;
    let socketReady = false;

    function connectSocket() {
        try {
            socket = io(window.GeoCollab.socketURL, {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 5,
                timeout: 10000
            });

            socket.on('connect', () => {
                socketReady = true;
                statusDot.classList.remove('connecting', 'error');
                statusDot.classList.add('connected');
                statusText.textContent = 'Server online — ready to deploy';
                enterBtn.disabled = false;
            });

            socket.on('disconnect', () => {
                socketReady = false;
                statusDot.classList.remove('connected', 'error');
                statusDot.classList.add('connecting');
                statusText.textContent = 'Reconnecting...';
                enterBtn.disabled = true;
            });

            socket.on('connect_error', () => {
                statusDot.classList.remove('connecting', 'connected');
                statusDot.classList.add('error');
                statusText.textContent = 'Server unreachable';
                // Still allow entering for local play
                enterBtn.disabled = false;
            });

            // Incoming text chat from other users
            socket.on('chatMsg', (data) => {
                const chatPanel = document.querySelector('#chat-panel');
                if (chatPanel && chatPanel.components['canvas-ui-panel']) {
                    const ts = new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    chatPanel.components['canvas-ui-panel'].pushMessage({
                        text: `[${ts}] ${data.name}: ${data.text}`,
                        type: 'chat',
                        color: data.color
                    });
                }
                appendNonVrLog(`${data.name}: ${data.text}`, 'log-user');
            });

            // Voice-activity relay for desktop non-VR users (optional)
            socket.on('voiceActivity', (data) => {
                updateAvatarVoiceRing(data.clientId, data.speaking);
            });

        } catch (e) {
            console.warn('Socket init failed:', e);
            statusText.textContent = 'Offline mode';
            enterBtn.disabled = false;
        }
    }

    // Show connecting state immediately
    statusDot.classList.add('connecting');
    statusText.textContent = 'Connecting to server...';
    connectSocket();

    // ── Color picker ───────────────────────────────────────────
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            state.color = swatch.dataset.color;
        });
    });

    // ── Room selector ──────────────────────────────────────────
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.room = btn.dataset.room;
        });
    });

    // ── Username input → enable button ─────────────────────────
    usernameInput.addEventListener('input', () => {
        const val = usernameInput.value.trim();
        state.name = val || 'Operator';
        if (!socketReady) {
            enterBtn.disabled = false; // allow offline entry
        }
    });

    // Default placeholder callsign
    const adjectives = ['Alpha', 'Bravo', 'Delta', 'Echo', 'Foxtrot', 'Ghost'];
    const nouns = ['One', 'Two', 'Six', 'Seven', 'Actual', 'Lead'];
    const defaultName = adjectives[Math.floor(Math.random() * adjectives.length)] + '-'
                      + nouns[Math.floor(Math.random() * nouns.length)];
    usernameInput.placeholder = defaultName;

    // ── Enter button ──────────────────────────────────────────
    enterBtn.addEventListener('click', enterScene);

    function enterScene() {
        // Finalize user state
        if (!usernameInput.value.trim()) {
            state.name = usernameInput.placeholder;
        }
        window.GeoCollab.userState = state;

        // Request mic permission
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('[GeoCollab] Microphone granted');
                // Dispatch so voice.js can set up the analyser
                document.dispatchEvent(new CustomEvent('micPermissionGranted', { detail: { stream } }));
            })
            .catch(err => {
                console.warn('[GeoCollab] Mic denied:', err);
                postSystemMessage('Microphone denied — voice disabled.');
            });

        // Initialize NAF with chosen room & socket URL
        const scene = document.querySelector('#main-scene');
        scene.setAttribute('networked-scene',
            `room: ${state.room};` +
            `adapter: socketio;` +
            `serverURL: ${window.GeoCollab.socketURL};` +
            `audio: true;`
        );

        // Send user info to server
        if (socket && socket.connected) {
            socket.emit('userInfo', { name: state.name, color: state.color });
        }

        // Update HUD with chosen callsign and room
        const roomLabel = {
            'geocollab-room-1': 'ALPHA',
            'geocollab-room-2': 'BRAVO',
            'geocollab-room-3': 'CHARLIE'
        }[state.room] || 'ALPHA';

        const hudRoom     = document.getElementById('hud-room');
        const hudCallsign = document.getElementById('hud-callsign');
        if (hudRoom)     hudRoom.textContent     = roomLabel;
        if (hudCallsign) hudCallsign.textContent = state.name.toUpperCase();

        // Transition
        lobbyOverlay.style.transition = 'opacity 0.6s';
        lobbyOverlay.style.opacity = '0';
        setTimeout(() => {
            lobbyOverlay.style.display = 'none';
            hudOverlay.style.display = 'block';
        }, 600);

        // Sync avatar name/color once NAF is ready
        waitForNAF(() => {
            const playerEl = document.querySelector('#player');
            if (playerEl) {
                if (!playerEl.getAttribute('networked')) {
                    playerEl.setAttribute('networked',
                        'template:#avatar-template; attachTemplateToLocal:false;');
                }
            }
            postSystemMessage(`${state.name} joined room ${roomLabel}.`);
        });
    }

    function waitForNAF(cb, attempts = 0) {
        if (typeof NAF !== 'undefined' && NAF.connection && NAF.connection.isConnected()) {
            cb();
        } else if (attempts < 30) {
            setTimeout(() => waitForNAF(cb, attempts + 1), 500);
        }
    }

    // ── Keyboard shortcuts ─────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        // Don't capture when lobby or chat input is focused
        if (lobbyOverlay.style.display !== 'none') return;
        if (document.activeElement === chatInput) return;
        if (document.activeElement === usernameInput) return;

        switch (e.key.toLowerCase()) {
            case 't':
                // Open chat bar
                chatBar.style.display = 'flex';
                chatInput.focus();
                break;
            case 'm':
                // Toggle 2D map mode
                toggleNonVRMode();
                break;
            case 'escape':
                if (chatBar.style.display !== 'none') {
                    chatBar.style.display = 'none';
                    chatInput.blur();
                } else {
                    // Return to lobby
                    hudOverlay.style.display = 'none';
                    lobbyOverlay.style.opacity = '0';
                    lobbyOverlay.style.display = 'flex';
                    requestAnimationFrame(() => {
                        lobbyOverlay.style.transition = 'opacity 0.4s';
                        lobbyOverlay.style.opacity = '1';
                    });
                }
                break;
        }
    });

    // ── Chat send ──────────────────────────────────────────────
    function sendChat() {
        const text = chatInput.value.trim();
        if (!text) { chatBar.style.display = 'none'; return; }

        if (socket && socket.connected) {
            socket.emit('chatMsg', { text });
        }

        // Show locally immediately
        const chatPanel = document.querySelector('#chat-panel');
        if (chatPanel && chatPanel.components['canvas-ui-panel']) {
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            chatPanel.components['canvas-ui-panel'].pushMessage({
                text: `[${ts}] ${state.name}: ${text}`,
                type: 'chat',
                color: state.color
            });
        }
        appendNonVrLog(`${state.name}: ${text}`, 'log-user');
        chatInput.value = '';
        chatBar.style.display = 'none';
    }

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
        if (e.key === 'Escape') { chatBar.style.display = 'none'; chatInput.blur(); }
    });
    chatSendBtn.addEventListener('click', sendChat);

    // ── Presence events ────────────────────────────────────────
    document.body.addEventListener('clientConnected', (evt) => {
        window.GeoCollab.userCount = (window.GeoCollab.userCount || 1) + 1;
        updateHUDUsers(window.GeoCollab.userCount);
        postSystemMessage('Operator joined the room.');
        if (window.GeoCollab.onUserCountChange) {
            window.GeoCollab.onUserCountChange(window.GeoCollab.userCount);
        }
    });

    document.body.addEventListener('clientDisconnected', (evt) => {
        window.GeoCollab.userCount = Math.max(1, (window.GeoCollab.userCount || 1) - 1);
        updateHUDUsers(window.GeoCollab.userCount);
        postSystemMessage('Operator left the room.');
        if (window.GeoCollab.onUserCountChange) {
            window.GeoCollab.onUserCountChange(window.GeoCollab.userCount);
        }
    });

    function updateHUDUsers(count) {
        const el = document.getElementById('hud-users');
        if (el) el.textContent = count;
        const nonvr = document.getElementById('nonvr-user-count');
        if (nonvr) nonvr.textContent = `${count} operator${count !== 1 ? 's' : ''} online`;
    }

    // ── Non-VR 2D mode ─────────────────────────────────────────
    let nonVrMapInitialized = false;

    function toggleNonVRMode() {
        if (nonvrOverlay.style.display !== 'none') {
            nonvrOverlay.style.display = 'none';
            return;
        }
        nonvrOverlay.style.display = 'flex';

        if (!nonVrMapInitialized) {
            nonVrMapInitialized = true;
            initNonVrMap();
        }
    }

    function initNonVrMap() {
        const container = document.getElementById('nonvr-map');
        if (!container || typeof maplibregl === 'undefined') return;

        const center = window.GeoCollab.defaultCenter;
        const zoom   = window.GeoCollab.defaultZoom;

        const nonVrMap = new maplibregl.Map({
            container: container,
            style: {
                version: 8,
                sources: {
                    osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 }
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
            },
            center: center,
            zoom: zoom
        });

        nonVrMap.addControl(new maplibregl.NavigationControl());

        // Sync with main map
        if (window.mapInstance) {
            nonVrMap.setCenter(window.mapInstance.getCenter());
            nonVrMap.setZoom(window.mapInstance.getZoom());
        }

        // Layer switcher
        document.querySelectorAll('#nonvr-sidebar .sidebar-btn[data-layer]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#nonvr-sidebar .sidebar-btn').forEach(b => b.classList.remove('sidebar-btn--active'));
                btn.classList.add('sidebar-btn--active');
                const layers = {
                    osm:  ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    esri: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                    carto: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png']
                };
                nonVrMap.setStyle({
                    version: 8,
                    sources: { base: { type: 'raster', tiles: layers[btn.dataset.layer], tileSize: 256 } },
                    layers: [{ id: 'base', type: 'raster', source: 'base' }]
                });
            });
        });
    }

    if (nonvrBackBtn) {
        nonvrBackBtn.addEventListener('click', () => {
            nonvrOverlay.style.display = 'none';
        });
    }

    // ── Helper: post system message ────────────────────────────
    function postSystemMessage(text) {
        const chatPanel = document.querySelector('#chat-panel');
        if (chatPanel && chatPanel.components['canvas-ui-panel']) {
            chatPanel.components['canvas-ui-panel'].pushMessage({ text, type: 'system' });
        }
        appendNonVrLog(text, 'log-sys');
    }

    window.GeoCollab.postSystemMessage = postSystemMessage;

    function appendNonVrLog(text, cls) {
        const log = document.getElementById('nonvr-log');
        if (!log) return;
        const line = document.createElement('div');
        line.className = `log-line ${cls}`;
        line.textContent = text;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
        // Keep only last 40 lines
        while (log.children.length > 40) log.removeChild(log.firstChild);
    }

    // ── Avatar voice ring helper ───────────────────────────────
    function updateAvatarVoiceRing(clientId, speaking) {
        const avatars = document.querySelectorAll('[avatar-body]');
        avatars.forEach(av => {
            const ring = av.querySelector('.av-voice-ring');
            if (ring) ring.setAttribute('visible', speaking);
        });
    }

    window.GeoCollab.updateAvatarVoiceRing = updateAvatarVoiceRing;
});
