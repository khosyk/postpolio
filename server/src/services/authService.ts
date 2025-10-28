import userRepository from '../repositories/userRepository';
import supabase from '../supabaseClient';
import { SignUpRequest, AuthResponse, UserProfile } from '../types';

class AuthService {
  // 이메일 회원가입
  async signUpWithEmail(
    email: string,
    password: string,
    userData: Partial<SignUpRequest> = {}
  ): Promise<AuthResponse> {
    // 입력값 검증
    if (!email || typeof email !== 'string') throw new Error('email is required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid email format');
    if (!password || typeof password !== 'string') throw new Error('password is required');
    if (password.length < 8) throw new Error('password must be at least 8 chars');

    try {
      // 1. Supabase Auth로 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userData.displayName || (email.includes('@') ? email.split('@')[0] : 'user'),
            avatar: userData.avatar || '👤',
          },
        },
      });

      if (authError) throw authError;
      if (!authData || !authData.user) throw new Error('User creation failed (no user)');
      const userId = authData.user.id;
      if (!userId) throw new Error('User creation failed (no id)');

      // 2. 사용자 프로필 생성
      if (authData.user) {
        const profileData = {
          email,
          displayName: userData.displayName || (email.includes('@') ? email.split('@')[0] : 'user'),
          avatar: userData.avatar || '👤',
        };

        const profile = await userRepository.createUserProfile(userId, profileData);
        if (!profile) throw new Error('Profile creation failed');

        return {
          user: {
            id: userId,
            email: authData.user.email ?? email,
          },
          profile,
          accessToken: authData.session?.access_token ?? undefined,
        };
      }

      throw new Error('User creation failed');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // 이메일 로그인
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    // 입력값 검증
    if (!email || typeof email !== 'string') throw new Error('email is required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid email format');
    if (!password || typeof password !== 'string') throw new Error('password is required');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data || !data.user) throw new Error('Authentication failed (no user)');

      // 사용자 프로필 조회
      const profile = await userRepository.getUserProfile(data.user.id);
      if (!profile) throw new Error('User profile not found');

      return {
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
        },
        profile,
        accessToken: data.session?.access_token ?? undefined,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // JWT 토큰 검증
  async verifyToken(token: string): Promise<any> {
    if (!token || typeof token !== 'string') throw new Error('token is required');
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error) throw error;
      if (!data || !data.user || !data.user.id) throw new Error('Invalid token');
      return data.user;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  // 로그아웃
  async signOut() {
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
  async updateProfile(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await userRepository.updateUserProfile(userId, updateData);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}

export default new AuthService();
