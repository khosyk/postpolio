require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.get('/', (_req, res) => {
  res.send('WebSocket server is running');
});

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on('join', (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.to(roomId).emit('system', { type: 'join', userId: socket.id });
  });

  socket.on('message', ({ roomId, text, userId }) => {
    if (!roomId || !text) return;
    const payload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      userId: userId || socket.id,
      createdAt: new Date().toISOString()
    };
    io.to(roomId).emit('message', payload);
  });

  socket.on('leave', (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    socket.to(roomId).emit('system', { type: 'leave', userId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`);
});
