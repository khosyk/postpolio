import express, { Request, Response } from 'express';
import authService from '../services/authService';
import { SignInRequest, UserProfile } from '../types';
import { isZodError, getErrorMessage } from '../utils/error';
import { SignInSchema, SignUpSchema } from '../../../shared/schemas/auth';
import { expressAuthMiddleware } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';

const router = express.Router();

// 이메일 회원가입
router.post('/signup', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  try {
    const parsed = SignUpSchema.parse(req.body);
    const { email, password, displayName, avatar } = parsed;

    const result = await authService.signUpWithEmail(email, password, {
      displayName,
      avatar,
    });

    sendSuccess(
      res,
      {
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        profile: result.profile,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      '회원가입이 완료되었습니다.',
      201
    );
  } catch (error: unknown) {
    console.error('Signup route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error)
      ? 400
      : msg.includes('already registered')
        ? 409
        : msg.includes('Invalid email') || msg.includes('Password should be at least')
          ? 400
          : 500;

    sendError(res, isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg, status);
  }
}));

// 이메일 로그인
router.post('/signin', authLimiter, asyncHandler(async (req: Request<{}, {}, SignInRequest>, res: Response) => {
  try {
    const parsed = SignInSchema.parse(req.body);
    const { email, password } = parsed;

    const result = await authService.signInWithEmail(email, password);

    sendSuccess(res, {
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      profile: result.profile,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, '로그인되었습니다.');
  } catch (error: unknown) {
    console.error('Signin route error:', error);
    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : msg.includes('Invalid login credentials') ? 401 : 500;
    sendError(res, isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg, status);
  }
}));

// 토큰 검증
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: '토큰이 필요합니다.',
      });
      return;
    }

    const user = await authService.verifyToken(token);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Token verification error:', error);

    res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.',
    });
  }
});

// 로그아웃
router.post('/logout', async (_req: Request, res: Response) => {
  try {
    await authService.signOut();

    res.json({
      success: true,
      message: '로그아웃되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      message: '로그아웃 중 오류가 발생했습니다.',
    });
  }
});

// 프로필 업데이트 (인증 필요)
router.put('/profile', expressAuthMiddleware, async (req: Request, res: Response) => {
  try {
    interface AuthenticatedRequest extends Request {
      user: { id: string; email: string | null };
    }

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '인증이 필요합니다.',
      });
      return;
    }

    const { displayName, avatar } = req.body;

    const updateData: Partial<UserProfile> = {};
    if (displayName !== undefined) updateData.nickname = displayName;
    if (avatar !== undefined) updateData.avatar = avatar;

    const profile = await authService.updateProfile(userId, updateData);

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      data: { profile },
    });
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    const msg = getErrorMessage(error);

    res.status(500).json({
      success: false,
      message: msg || '프로필 업데이트 중 오류가 발생했습니다.',
    });
  }
});

// Refresh Token으로 Access Token 갱신
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'refreshToken이 필요합니다.',
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: '토큰이 갱신되었습니다.',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error: unknown) {
    console.error('Refresh token route error:', error);
    const msg = getErrorMessage(error);

    res.status(401).json({
      success: false,
      message: msg || '토큰 갱신에 실패했습니다.',
    });
  }
});

// 회원탈퇴
router.delete('/withdraw', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.',
      });
      return;
    }

    const user = await authService.verifyToken(token);

    await authService.withdraw(user.id);

    res.json({
      success: true,
      message: '회원탈퇴가 완료되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Withdraw error:', error);

    res.status(500).json({
      success: false,
      message: '회원탈퇴 중 오류가 발생했습니다.',
    });
  }
});

export default router;
