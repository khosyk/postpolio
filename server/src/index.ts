import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { env } from './config/env';
import authRoutes from './routes/authRoutes';
import groupRoutes from './routes/groupRoutes';
import messageRoutes from './routes/messageRoutes';
import gradeRoutes from './routes/gradeRoutes';
import pomodoroRoutes from './routes/pomodoroRoutes';
import statsRoutes from './routes/statsRoutes';
import healthRoutes from './routes/healthRoutes';
import { setupSocketHandlers } from './socket/socketHandler';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { securityHeaders, requestSizeLimiter } from './middleware/security';
import { requestIdMiddleware, requestLogger } from './middleware/requestLogger';
import { logger } from './utils/logger';
import compression from 'compression';

const app = express();
const server = http.createServer(app);

const PORT = parseInt(env.PORT, 10);
const CORS_ORIGIN = env.CORS_ORIGIN;

// 보안 헤더 설정
app.use(securityHeaders);

// Response Compression (gzip)
app.use(compression());

// Request ID 생성 (로깅 추적용)
app.use(requestIdMiddleware);

// 요청 로깅
app.use(requestLogger);

// CORS 설정
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 요청 크기 제한
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestSizeLimiter);

// 요청 제한 적용 (헬스체크 제외)
app.use(apiLimiter);

// 헬스체크 (요청 제한 제외)
app.use('/', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', messageRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/stats', statsRoutes);

// 404 핸들러
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
  });
});

// 글로벌 에러 핸들러 (모든 라우트 다음에 위치)
app.use(errorHandler);

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
  logger.info(`Server started`, {
    port: PORT,
    environment: env.NODE_ENV,
    corsOrigin: CORS_ORIGIN,
  });
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });

  // 강제 종료 타임아웃 (10초)
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
