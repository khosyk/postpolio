require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

app.get('/', (_req, res) => {
  res.send('WebSocket server is running');
});

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// 인증 미들웨어 적용 (선택적)
// io.use(require('./middleware/authMiddleware').socketAuthMiddleware);

// In-memory room state (demo only)
const roomIdToMessages = new Map(); // roomId -> message[]
const roomIdToUsers = new Map(); // roomId -> Set<userId>

// Helper to generate user info
const generateUserInfo = (socketId) => {
  const adjectives = ['행복한', '즐거운', '친절한', '똑똑한', '용감한'];
  const nouns = ['사자', '호랑이', '코끼리', '기린', '펭귄'];
  const emojis = ['😀', '😎', '🤩', '🥳', '😇', '🚀', '💡', '🌟', '🌈', '🤖'];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  return {
    displayName: `${randomAdjective} ${randomNoun} ${socketId.slice(0, 4)}`,
    avatar: randomEmoji,
  };
};

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  
  // Assign user info on connection
  const userInfo = generateUserInfo(socket.id);
  socket.data.displayName = userInfo.displayName;
  socket.data.avatar = userInfo.avatar;

  socket.on('join', (roomId) => {
    if (!roomId) return;
    socket.join(roomId);

    // track presence
    if (!roomIdToUsers.has(roomId)) roomIdToUsers.set(roomId, new Set());
    roomIdToUsers.get(roomId).add(socket.id);

    // send joined ACK + history to self
    const history = roomIdToMessages.get(roomId) ?? [];
    socket.emit('joined', { 
      roomId, 
      userId: socket.id, 
      displayName: socket.data.displayName,
      avatar: socket.data.avatar,
      history 
    });

    // notify others in room
    socket.to(roomId).emit('system', { 
      kind: 'join', 
      userId: socket.id, 
      displayName: socket.data.displayName,
      avatar: socket.data.avatar,
      roomId 
    });
  });

  socket.on('message', ({ roomId, text }) => {
    if (!roomId || !text) return;
    const payload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      userId: socket.id,
      displayName: socket.data.displayName,
      avatar: socket.data.avatar,
      createdAt: new Date().toISOString(),
      type: 'message'
    };
    if (!roomIdToMessages.has(roomId)) roomIdToMessages.set(roomId, []);
    roomIdToMessages.get(roomId).push(payload);
    io.to(roomId).emit('message', payload);
  });

  socket.on('clearHistory', ({ roomId }) => {
    if (!roomId) return;
    roomIdToMessages.set(roomId, []);
    io.to(roomId).emit('historyCleared', { roomId, by: socket.id });
  });

  socket.on('leave', (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    const users = roomIdToUsers.get(roomId);
    if (users) {
      users.delete(socket.id);
      if (users.size === 0) roomIdToUsers.delete(roomId);
    }
    socket.to(roomId).emit('system', { 
      kind: 'leave', 
      userId: socket.id, 
      displayName: socket.data.displayName,
      avatar: socket.data.avatar,
      roomId 
    });
  });

  socket.on('disconnecting', () => {
    // notify all rooms this socket was in
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      const users = roomIdToUsers.get(roomId);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) roomIdToUsers.delete(roomId);
      }
      socket.to(roomId).emit('system', { kind: 'leave', userId: socket.id, roomId });
    }
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`);
});
