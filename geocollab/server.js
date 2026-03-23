const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io');

const app = express();

let options = {};
try {
  options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
  };
} catch (err) {
  console.warn('⚠️ Could not load certificates from ./certs. Server will run without HTTPS or crash depending on setup.');
}

app.use(cors());
app.use(express.static('public'));
app.use('/terrain', express.static('terrain_tiles'));

const webServer = https.createServer(options, app);
const io = socketIo(webServer);

const rooms = new Map();
const maxOccupantsInRoom = 50;

io.on('connection', (socket) => {
  console.log('user connected', socket.id);
  let curRoom = null;

  socket.on('joinRoom', (data) => {
    const { room } = data;
    curRoom = room;
    let roomInfo = rooms.get(room);
    if (!roomInfo) {
      roomInfo = { name: room, occupants: {}, occupantsCount: 0 };
      rooms.set(room, roomInfo);
    }

    const joinedTime = Date.now();
    roomInfo.occupants[socket.id] = joinedTime;
    roomInfo.occupantsCount++;

    console.log(`${socket.id} joined room ${curRoom}`);
    socket.join(curRoom);
    socket.emit('connectSuccess', { joinedTime });
    const occupants = roomInfo.occupants;
    io.in(curRoom).emit('occupantsChanged', { occupants });
  });

  socket.on('send', (data) => {
    io.to(data.to).emit('send', data);
  });

  socket.on('broadcast', (data) => {
    socket.to(curRoom).emit('broadcast', data);
  });

  socket.on('disconnect', () => {
    const roomInfo = rooms.get(curRoom);
    if (roomInfo) {
      console.log('user disconnected', socket.id);
      delete roomInfo.occupants[socket.id];
      roomInfo.occupantsCount--;
      const occupants = roomInfo.occupants;
      socket.to(curRoom).emit('occupantsChanged', { occupants });
      if (roomInfo.occupantsCount === 0) {
        rooms.delete(curRoom);
      }
    }
  });
});

const port = process.env.PORT || 3000;
webServer.listen(port, '0.0.0.0', () => {
  console.log(`🔒 HTTPS server running at https://0.0.0.0:${port}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
