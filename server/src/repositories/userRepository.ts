import supabase from '../supabaseClient';
import { UserProfile } from '../types';
import { cacheService, cacheKeys } from '../utils/cache';
import { logger } from '../utils/logger';

class UserRepository {
  // 사용자 프로필 생성
  async createUserProfile(userId: string, userData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: userId,
            email: userData.email,
            nickname: userData.nickname,
            avatar: userData.avatar,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // 사용자 프로필 조회 (캐싱 적용)
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // 캐시 확인
      const cached = cacheService.get<UserProfile>(cacheKeys.userProfile(userId));
      if (cached) {
        logger.debug('User profile cache hit', { userId });
        return cached;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found

      // 캐시 저장 (5분)
      if (data) {
        cacheService.set(cacheKeys.userProfile(userId), data, 300);
      }

      return data;
    } catch (error) {
      logger.error('Error fetching user profile', { userId, error });
      throw error;
    }
  }

  // 사용자 프로필 업데이트 (캐시 무효화)
  async updateUserProfile(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // 캐시 무효화 및 업데이트
      cacheService.del(cacheKeys.userProfile(userId));
      if (data) {
        cacheService.set(cacheKeys.userProfile(userId), data, 300);
      }

      return data;
    } catch (error) {
      logger.error('Error updating user profile', { userId, error });
      throw error;
    }
  }

  // 배치 조회 (N+1 문제 해결)
  async getUserProfilesBatch(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];

    try {
      // 캐시에서 먼저 확인
      const cached: UserProfile[] = [];
      const uncachedIds: string[] = [];

      for (const userId of userIds) {
        const cachedProfile = cacheService.get<UserProfile>(cacheKeys.userProfile(userId));
        if (cachedProfile) {
          cached.push(cachedProfile);
        } else {
          uncachedIds.push(userId);
        }
      }

      // 캐시에 없는 것만 DB 조회
      if (uncachedIds.length === 0) {
        logger.debug('All user profiles from cache', { count: cached.length });
        return cached;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', uncachedIds);

      if (error) throw error;

      const profiles = data || [];

      // 조회한 프로필 캐시 저장
      for (const profile of profiles) {
        cacheService.set(cacheKeys.userProfile(profile.user_id), profile, 300);
      }

      return [...cached, ...profiles];
    } catch (error) {
      logger.error('Error fetching user profiles batch', { userIds, error });
      throw error;
    }
  }

  // 이메일로 사용자 조회
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  // 닉네임으로 사용자 조회 (중복 체크용)
  async getUserByNickname(nickname: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('nickname', nickname)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user by nickname:', error);
      throw error;
    }
  }

  // 사용자 프로필 삭제
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }
}

export default new UserRepository();
