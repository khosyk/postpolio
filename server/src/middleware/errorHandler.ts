import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { getErrorMessage } from '../utils/error';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Zod 검증 에러
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: '요청 본문이 유효하지 않습니다.',
      errors: error.issues.map((e: ZodIssue) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // 커스텀 AppError
  if (error instanceof AppError) {
    logger.warn(`AppError [${error.statusCode}]: ${error.message}`, {
      path: req.path,
      method: req.method,
      requestId: (req as any).id,
    });

    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // 예상치 못한 에러
  const errorMessage = getErrorMessage(error);
  logger.error('Unexpected error', {
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    requestId: (req as any).id,
  });

  return res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'production'
        ? '서버 오류가 발생했습니다.'
        : errorMessage,
  });
};
