import express, { Request, Response } from 'express';
import groupService from '../services/groupService';
import { isZodError, getErrorMessage } from '../utils/error';
import { CreateGroupSchema, InviteMemberSchema } from '../../../shared/schemas/group';
import { expressAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(expressAuthMiddleware);

// 사용자 ID 추출 헬퍼 (타입 안전성 보장)
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
  const { id } = req.params;
  if (!id) {
    throw new Error('Group ID is required');
  }
  return id;
};

// 그룹 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateGroupSchema.parse(req.body);
    const userId = getUserId(req);

    const group = await groupService.createGroup(userId, parsed);

    res.status(201).json({
      success: true,
      message: '그룹이 생성되었습니다.',
      data: { group },
    });
  } catch (error: unknown) {
    console.error('Create group route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 내 그룹 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const groups = await groupService.getUserGroups(userId);

    res.json({
      success: true,
      data: { groups },
    });
  } catch (error: unknown) {
    console.error('Get user groups route error:', error);

    res.status(500).json({
      success: false,
      message: '그룹 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 그룹 상세 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    const group = await groupService.getGroupById(groupId, userId);

    if (!group) {
      res.status(404).json({
        success: false,
        message: '그룹을 찾을 수 없습니다.',
      });
      return;
    }

    res.json({
      success: true,
      data: { group },
    });
  } catch (error: unknown) {
    console.error('Get group route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('멤버만') ? 403 : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 멤버 초대
router.post('/:id/invite', async (req: Request, res: Response) => {
  try {
    const groupId = getGroupId(req);
    const parsed = InviteMemberSchema.parse(req.body);
    const userId = getUserId(req);

    await groupService.inviteMember(groupId, userId, parsed.email);

    res.json({
      success: true,
      message: '멤버가 초대되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Invite member route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : msg.includes('찾을 수 없습니다') ? 404 : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 그룹 나가기
router.delete('/:id/leave', async (req: Request, res: Response) => {
  try {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    await groupService.leaveGroup(groupId, userId);

    res.json({
      success: true,
      message: '그룹에서 나갔습니다.',
    });
  } catch (error: unknown) {
    console.error('Leave group route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('소유자') ? 403 : msg.includes('찾을 수 없습니다') ? 404 : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 그룹 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    await groupService.deleteGroup(groupId, userId);

    res.json({
      success: true,
      message: '그룹이 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Delete group route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('소유자만') ? 403 : msg.includes('찾을 수 없습니다') ? 404 : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

export default router;
