import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * 보안 헤더 설정
 * XSS, Clickjacking, MIME 타입 스니핑 등 방지
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Socket.IO 호환성
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * 요청 크기 제한 미들웨어
 */
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    res.status(413).json({
      success: false,
      message: '요청 크기가 너무 큽니다. (최대 10MB)',
    });
    return;
  }

  next();
};

/**
 * 입력값 sanitization (기본)
 * XSS 공격 방지
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // req.body의 문자열 값에서 위험한 문자 제거
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      // 기본적인 XSS 방지 (실제로는 더 강력한 라이브러리 사용 권장)
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body) as typeof req.body;
  }

  next();
};
