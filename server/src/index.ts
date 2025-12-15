import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import groupRoutes from './routes/groupRoutes';
import messageRoutes from './routes/messageRoutes';
import { setupSocketHandlers } from './socket/socketHandler';

const app = express();
const server = http.createServer(app);

const PORT = process.env['PORT'] || '4000';
const CORS_ORIGIN = process.env['CORS_ORIGIN'] || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', messageRoutes);

app.get('/', (_req, res) => {
  res.send('WebSocket server is running');
});

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// 인증 미들웨어 적용
import { socketAuthMiddleware } from './middleware/authMiddleware';
io.use(socketAuthMiddleware);

// Setup socket handlers
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`);
});
