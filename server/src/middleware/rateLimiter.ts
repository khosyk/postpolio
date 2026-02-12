import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// 일반 API 요청 제한
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // 헬스체크는 제한 제외
    if (req.path === '/health') return true;
    // 개발 환경에서는 전체 rate limit 완화 (테스트 편의를 위해)
    if (env.NODE_ENV !== 'production') return true;
    return false;
  },
});

// 인증 관련 엄격한 제한
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: env.NODE_ENV === 'production' ? 5 : 1000, // 개발 환경에서는 넉넉하게
  message: '너무 많은 로그인 시도가 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // 개발 환경에서는 아예 스킵해도 됨 (원하면 주석 해제)
  // skip: () => env.NODE_ENV !== 'production',
});
