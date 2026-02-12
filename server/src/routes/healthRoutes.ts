import express, { Request, Response } from 'express';
import supabase from '../supabaseClient';
import { env } from '../config/env';

const router = express.Router();

// 헬스체크 엔드포인트
router.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    services: {
      database: 'unknown',
    },
  };

  // 데이터베이스 연결 확인
  try {
    const { error } = await supabase.from('user_profiles').select('count').limit(1);
    health.services.database = error ? 'down' : 'up';
  } catch {
    health.services.database = 'down';
  }

  const statusCode = health.services.database === 'up' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
