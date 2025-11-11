import express, { Request, Response } from 'express';
import authService from '../services/authService';
import { SignInRequest, UserProfile } from '../types';
import { isZodError, getErrorMessage } from '../utils/error';
import { SignInSchema, SignUpSchema } from '../../../shared/schemas/auth';
const router = express.Router();

// 이메일 회원가입
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const parsed = SignUpSchema.parse(req.body);
    const { email, password, displayName, avatar } = parsed;
    const result = await authService.signUpWithEmail(email, password, {
      displayName,
      avatar,
    });

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        profile: result.profile,
      },
    });
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

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 이메일 로그인
router.post('/signin', async (req: Request<{}, {}, SignInRequest>, res: Response) => {
  try {
    const parsed = SignInSchema.parse(req.body);
    const { email, password } = parsed;

    const result = await authService.signInWithEmail(email, password);

    res.json({
      success: true,
      message: '로그인되었습니다.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        profile: result.profile,
        accessToken: result.accessToken,
      },
    });
  } catch (error: unknown) {
    console.error('Signin route error:', error);
    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : msg.includes('Invalid login credentials') ? 401 : 500;
    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

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

// 프로필 업데이트
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { userId, displayName, avatar } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.',
      });
      return;
    }

    const updateData: Partial<UserProfile> = {};
    if (displayName) updateData.nickname = displayName;
    if (avatar) updateData.avatar = avatar;

    const profile = await authService.updateProfile(userId, updateData);

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      data: { profile },
    });
  } catch (error: unknown) {
    console.error('Profile update error:', error);

    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.',
    });
  }
});

export default router;
