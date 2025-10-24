import authService from '../services/authService';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

// Socket.IO 인증 미들웨어
const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.['token'];

    if (!token) {
      next(new Error('Authentication token required'));
      return;
    }

    const user = await authService.verifyToken(token);

    if (!user) {
      next(new Error('Invalid token'));
      return;
    }

    // 사용자 정보를 소켓에 저장
    (socket.data as any).userId = user.id;
    (socket.data as any).email = user.email;

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
};

// Express 인증 미들웨어
const expressAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
      return;
    }

    const user = await authService.verifyToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Express auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

export { socketAuthMiddleware, expressAuthMiddleware };
