import express, { Request, Response } from 'express';
import pomodoroService from '../services/pomodoroService';
import { isZodError, getErrorMessage } from '../utils/error';
import {
  CreatePomodoroSessionSchema,
  UpdatePomodoroSettingsSchema,
} from '../../../shared/schemas/pomodoro';
import { expressAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(expressAuthMiddleware);

// 사용자 ID 추출 헬퍼
interface AuthenticatedRequest extends Request {
  user: { id: string; email: string | null };
}

const getUserId = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user || !authReq.user.id) {
    throw new Error('User ID is missing');
  }
  return authReq.user.id;
};

// 세션 ID 추출 헬퍼
const getSessionId = (req: Request): string => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Session ID is required');
  }
  return id;
};

// 포모도로 세션 시작
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const parsed = CreatePomodoroSessionSchema.parse(req.body);
    const userId = getUserId(req);

    const session = await pomodoroService.startSession(
      userId,
      parsed.type,
      parsed.duration_minutes
    );

    res.status(201).json({
      success: true,
      message: '포모도로 세션이 시작되었습니다.',
      data: { session },
    });
  } catch (error: unknown) {
    console.error('Start pomodoro session route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 세션 완료
router.put('/sessions/:id/complete', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const userId = getUserId(req);

    const session = await pomodoroService.completeSession(sessionId, userId);

    res.json({
      success: true,
      message: '포모도로 세션이 완료되었습니다.',
      data: { session },
    });
  } catch (error: unknown) {
    console.error('Complete pomodoro session route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('찾을 수 없습니다') ? 404 : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 세션 취소
router.put('/sessions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const sessionId = getSessionId(req);
    const userId = getUserId(req);

    const session = await pomodoroService.cancelSession(sessionId, userId);

    res.json({
      success: true,
      message: '포모도로 세션이 취소되었습니다.',
      data: { session },
    });
  } catch (error: unknown) {
    console.error('Cancel pomodoro session route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('찾을 수 없습니다') ? 404 : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 내 포모도로 세션 목록 조회
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;

    const sessions = await pomodoroService.getUserSessions(userId, limit);

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error: unknown) {
    console.error('Get user sessions route error:', error);

    res.status(500).json({
      success: false,
      message: '세션 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 포모도로 설정 조회
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const settings = await pomodoroService.getUserSettings(userId);

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error: unknown) {
    console.error('Get pomodoro settings route error:', error);

    res.status(500).json({
      success: false,
      message: '설정 조회 중 오류가 발생했습니다.',
    });
  }
});

// 포모도로 설정 변경
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const parsed = UpdatePomodoroSettingsSchema.parse(req.body);
    const userId = getUserId(req);

    await pomodoroService.updateUserSettings(userId, parsed);

    res.json({
      success: true,
      message: '포모도로 설정이 변경되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Update pomodoro settings route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

export default router;
