import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import { setupSocketHandlers } from './socket/socketHandler';

const app = express();
const server = http.createServer(app);

const PORT = process.env['PORT'] || '4000';
const CORS_ORIGIN = process.env['CORS_ORIGIN'] || '*';

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
    methods: ['GET', 'POST'],
  },
});

// 인증 미들웨어 적용 (선택적)
// io.use(require('./middleware/authMiddleware').socketAuthMiddleware);

// Setup socket handlers
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`);
});
