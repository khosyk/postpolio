import express, { Request, Response } from 'express';
import messageService from '../services/messageService';
import { getErrorMessage } from '../utils/error';
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

// 그룹 ID 추출 헬퍼
const getGroupId = (req: Request): string => {
  const { groupId } = req.params;
  if (!groupId) {
    throw new Error('Group ID is required');
  }
  return groupId;
};

// 그룹 메시지 목록 조회
router.get('/groups/:groupId/messages', async (req: Request, res: Response) => {
  try {
    const groupId = getGroupId(req);
    const userId = getUserId(req);
    const limit = parseInt((req.query as { limit?: string })['limit'] || '100') || 100;
    const offset = parseInt((req.query as { offset?: string })['offset'] || '0') || 0;

    const messages = await messageService.getGroupMessages(groupId, userId, limit, offset);

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error: unknown) {
    console.error('Get group messages route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('멤버만') ? 403 : msg.includes('찾을 수 없습니다') ? 404 : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

export default router;

