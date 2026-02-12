import express, { Request, Response } from 'express';
import groupService from '../services/groupService';
import studyService from '../services/studyService';
import { AppError } from '../middleware/errorHandler';
import {
  CreateGroupSchema,
  UpdateGroupSchema,
  UpdateGroupSettingsSchema,
  InviteMemberSchema,
} from '../../../shared/schemas/group';
import { expressAuthMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

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
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateGroupSchema.parse(req.body);
    const userId = getUserId(req);

    const group = await groupService.createGroup(userId, parsed);

    sendSuccess(res, { group }, '그룹이 생성되었습니다.', 201);
  })
);

// 내 그룹 목록 조회
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const groups = await groupService.getUserGroups(userId);
    sendSuccess(res, { groups });
  })
);

// 그룹 상세 조회
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    const group = await groupService.getGroupById(groupId, userId);

    if (!group) {
      throw new AppError(404, '그룹을 찾을 수 없습니다.');
    }

    sendSuccess(res, { group });
  })
);

// 그룹 수정
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const parsed = UpdateGroupSchema.parse(req.body);
    const userId = getUserId(req);

    const group = await groupService.updateGroup(groupId, userId, parsed);

    sendSuccess(res, { group }, '그룹이 수정되었습니다.');
  })
);

// 그룹 설정 변경
router.put(
  '/:id/settings',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const parsed = UpdateGroupSettingsSchema.parse(req.body);
    const userId = getUserId(req);

    const group = await groupService.updateGroupSettings(groupId, userId, parsed);

    sendSuccess(res, { group }, '그룹 설정이 변경되었습니다.');
  })
);

// 멤버 초대
router.post(
  '/:id/invite',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const parsed = InviteMemberSchema.parse(req.body);
    const userId = getUserId(req);

    await groupService.inviteMember(groupId, userId, parsed.email);

    sendSuccess(res, undefined, '멤버가 초대되었습니다.');
  })
);

// 그룹 나가기
router.delete(
  '/:id/leave',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    await groupService.leaveGroup(groupId, userId);

    sendSuccess(res, undefined, '그룹에서 나갔습니다.');
  })
);

// 그룹 삭제
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    await groupService.deleteGroup(groupId, userId);

    sendSuccess(res, undefined, '그룹이 삭제되었습니다.');
  })
);

// 그룹 멤버들의 오늘 공부시간 조회 (그룹 챗 탭용)
router.get(
  '/:id/members/study-time',
  asyncHandler(async (req: Request, res: Response) => {
    const groupId = getGroupId(req);
    const userId = getUserId(req);

    const membersStudyTime = await studyService.getGroupMembersStudyTime(groupId, userId);

    sendSuccess(res, { members: membersStudyTime });
  })
);

export default router;
