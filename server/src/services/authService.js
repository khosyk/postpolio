const supabase = require('./supabaseClient');
const userRepository = require('../repositories/userRepository');

class AuthService {
  // 이메일 회원가입
  async signUpWithEmail(email, password, userData = {}) {
    try {
      // 1. Supabase Auth로 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userData.displayName || email.split('@')[0],
            avatar: userData.avatar || '👤'
          }
        }
      });

      if (authError) throw authError;

      // 2. 사용자 프로필 생성
      if (authData.user) {
        const profileData = {
          email,
          displayName: userData.displayName || email.split('@')[0],
          avatar: userData.avatar || '👤'
        };

        const profile = await userRepository.createUserProfile(
          authData.user.id, 
          profileData
        );

        return {
          user: authData.user,
          profile,
          session: authData.session
        };
      }

      throw new Error('User creation failed');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // 이메일 로그인
  async signInWithEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // 사용자 프로필 조회
      const profile = await userRepository.getUserProfile(data.user.id);

      return {
        user: data.user,
        profile,
        session: data.session
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // JWT 토큰 검증
  async verifyToken(token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  // 로그아웃
  async signOut(token) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // 사용자 프로필 업데이트
  async updateProfile(userId, updateData) {
    try {
      return await userRepository.updateUserProfile(userId, updateData);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
