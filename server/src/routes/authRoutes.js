const express = require('express');
const authService = require('../services/authService');
const router = express.Router();

// 이메일 회원가입
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, avatar } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호는 필수입니다.'
      });
    }

    const result = await authService.signUpWithEmail(email, password, {
      displayName,
      avatar
    });

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email
        },
        profile: result.profile
      }
    });
  } catch (error) {
    console.error('Signup route error:', error);
    
    let message = '회원가입 중 오류가 발생했습니다.';
    let statusCode = 500;

    if (error.message.includes('already registered')) {
      message = '이미 등록된 이메일입니다.';
      statusCode = 409;
    } else if (error.message.includes('Invalid email')) {
      message = '유효하지 않은 이메일 형식입니다.';
      statusCode = 400;
    } else if (error.message.includes('Password should be at least')) {
      message = '비밀번호는 최소 6자 이상이어야 합니다.';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// 이메일 로그인
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호는 필수입니다.'
      });
    }

    const result = await authService.signInWithEmail(email, password);

    res.json({
      success: true,
      message: '로그인되었습니다.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email
        },
        profile: result.profile,
        accessToken: result.session.access_token
      }
    });
  } catch (error) {
    console.error('Signin route error:', error);
    
    let message = '로그인 중 오류가 발생했습니다.';
    let statusCode = 500;

    if (error.message.includes('Invalid login credentials')) {
      message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// 토큰 검증
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '토큰이 필요합니다.'
      });
    }

    const user = await authService.verifyToken(token);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }
});

// 프로필 업데이트
router.put('/profile', async (req, res) => {
  try {
    const { userId, displayName, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.'
      });
    }

    const updateData = {};
    if (displayName) updateData.display_name = displayName;
    if (avatar) updateData.avatar = avatar;

    const profile = await authService.updateProfile(userId, updateData);

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      data: { profile }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
