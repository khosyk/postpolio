import { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
) => {
  res.status(statusCode).json({
    success: true,
    message: message || '요청이 성공적으로 처리되었습니다.',
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, unknown> | unknown[]
) => {
  const response: {
    success: boolean;
    message: string;
    errors?: Record<string, unknown> | unknown[];
  } = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};
