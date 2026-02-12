import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Request ID 생성 및 응답 헤더에 추가
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  (req as any).id = uuidv4();
  res.setHeader('X-Request-ID', (req as any).id);
  next();
};

/**
 * 요청 로깅 미들웨어
 * 응답 시간, 상태 코드 등을 로깅
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = (req as any).id;

  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId,
      userId: (req as any).user?.id,
    };

    // 에러는 warn 레벨로, 성공은 info 레벨로
    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};
