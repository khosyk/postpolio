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
      // 닉네임 후보 생성 (이메일 앞부분 또는 displayName)
      const baseNickname =
        (userData.displayName || (email.includes('@') ? email.split('@')[0] : '') || 'user')
          .slice(0, 16);

      // 닉네임 중복 체크 및 가용한 닉네임 찾기
      let finalNickname: string = baseNickname;
      let suffix = 1;
      // 최대 20회 정도 시도 (user, user1, user2, ...)
      // 완전한 레이스 컨디션 방지는 DB 유니크 인덱스에서 보완
      // 여기서는 UX 차원의 선제 체크만 수행
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await userRepository.getUserByNickname(finalNickname);
        if (!existing) break;
        suffix += 1;
        finalNickname = `${baseNickname}${suffix}`;
        if (suffix > 20) {
          throw new Error('닉네임이 이미 사용 중입니다. 다른 닉네임을 입력해주세요.');
        }
      }

      // 1. Supabase Auth로 계정 생성
      // emailRedirectTo: 이메일 인증 링크 클릭 시 리다이렉트될 URL
      // React Native 앱의 경우 딥링크 또는 웹 페이지로 설정
      const emailRedirectTo =
        process.env['EMAIL_REDIRECT_URL'] || process.env['SUPABASE_REDIRECT_URL'] || undefined;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            nickname: finalNickname,
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
          nickname: finalNickname,
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
          refreshToken: authData.session?.refresh_token ?? undefined,
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
        refreshToken: data.session?.refresh_token ?? undefined,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // JWT 토큰 검증
  async verifyToken(token: string): Promise<{ id: string; email: string | null }> {
    if (!token || typeof token !== 'string') throw new Error('token is required');
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error) throw error;
      if (!data || !data.user || !data.user.id) throw new Error('Invalid token');
      return { id: data.user.id, email: data.user.email ?? null };
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
      // 닉네임 변경 요청 시 중복 체크
      if (updateData.nickname) {
        const existing = await userRepository.getUserByNickname(updateData.nickname);
        if (existing && existing.user_id !== userId) {
          throw new Error('이미 사용 중인 닉네임입니다.');
        }
      }

      return await userRepository.updateUserProfile(userId, updateData);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Refresh Token으로 Access Token 갱신
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken || typeof refreshToken !== 'string')
      throw new Error('refreshToken is required');
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) throw error;
      if (!data || !data.session) throw new Error('Failed to refresh session');

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  // 회원탈퇴
  async withdraw(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') throw new Error('userId is required');
    try {
      // 1. 프로필 삭제
      await userRepository.deleteUserProfile(userId);

      // 2. Supabase Auth 사용자 삭제 (서비스 롤 키 사용)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    }
  }
}

export default new AuthService();
