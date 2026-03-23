const http    = require('http');
const express = require('express');
const cors    = require('cors');
const socketIo = require('socket.io');

const app = express();

app.use(cors());
app.use(express.static('public'));
app.use('/terrain', express.static('terrain_tiles'));

const webServer = http.createServer(app);

const io = socketIo(webServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

// ── Room state ────────────────────────────────────────────────────────────────
const rooms    = new Map();
const userInfo = new Map(); // socketId → { name, color }

const MAX_ROOM = 50;

io.on('connection', (socket) => {
    console.log('+ connected', socket.id);
    let curRoom = null;

    // ── NAF room join ─────────────────────────────────────────
    socket.on('joinRoom', (data) => {
        const { room } = data;
        curRoom = room;

        let roomInfo = rooms.get(room);
        if (!roomInfo) {
            roomInfo = { name: room, occupants: {}, occupantsCount: 0 };
            rooms.set(room, roomInfo);
        }
        if (roomInfo.occupantsCount >= MAX_ROOM) {
            socket.emit('roomFull');
            return;
        }

        roomInfo.occupants[socket.id] = Date.now();
        roomInfo.occupantsCount++;

        console.log(`  ${socket.id} → room "${curRoom}" (${roomInfo.occupantsCount} users)`);
        socket.join(curRoom);
        socket.emit('connectSuccess', { joinedTime: Date.now() });
        io.in(curRoom).emit('occupantsChanged', { occupants: roomInfo.occupants });
    });

    // ── NAF relay ─────────────────────────────────────────────
    socket.on('send', (data) => {
        io.to(data.to).emit('send', data);
    });

    socket.on('broadcast', (data) => {
        socket.to(curRoom).emit('broadcast', data);
    });

    // ── User identity ─────────────────────────────────────────
    socket.on('userInfo', (data) => {
        userInfo.set(socket.id, {
            name:  (data.name  || 'Operator').slice(0, 20),
            color: (data.color || '#4CC3D9')
        });
    });

    // ── Text chat ─────────────────────────────────────────────
    socket.on('chatMsg', (data) => {
        if (!curRoom) return;
        const info = userInfo.get(socket.id) || { name: 'Unknown', color: '#ffffff' };
        const msg  = {
            text:  String(data.text || '').slice(0, 200),
            name:  info.name,
            color: info.color,
            time:  Date.now()
        };
        io.in(curRoom).emit('chatMsg', msg);
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log('- disconnected', socket.id);
        userInfo.delete(socket.id);

        const roomInfo = rooms.get(curRoom);
        if (roomInfo) {
            delete roomInfo.occupants[socket.id];
            roomInfo.occupantsCount = Math.max(0, roomInfo.occupantsCount - 1);
            socket.to(curRoom).emit('occupantsChanged', { occupants: roomInfo.occupants });
            if (roomInfo.occupantsCount === 0) {
                rooms.delete(curRoom);
                console.log(`  room "${curRoom}" removed (empty)`);
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
webServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 GeoCollab server running on http://0.0.0.0:${PORT}`);
});

process.on('uncaughtException',  (err) => console.error('Uncaught Exception:',  err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
