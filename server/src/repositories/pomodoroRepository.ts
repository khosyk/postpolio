import supabase from '../supabaseClient';
import { PomodoroSession, PomodoroSettings, UpdatePomodoroSettingsRequest } from '../types';
import { cacheService, cacheKeys } from '../utils/cache';
import { logger } from '../utils/logger';

class PomodoroRepository {
  // 포모도로 세션 생성
  async createSession(sessionData: {
    userId: string;
    type: string;
    durationMinutes: number;
  }): Promise<PomodoroSession> {
    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .insert([
          {
            user_id: sessionData.userId,
            type: sessionData.type,
            duration_minutes: sessionData.durationMinutes,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating pomodoro session:', error);
      throw error;
    }
  }

  // 세션 업데이트
  async updateSession(
    sessionId: string,
    updates: Partial<PomodoroSession>
  ): Promise<PomodoroSession> {
    try {
      const updateData: Partial<PomodoroSession> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating pomodoro session:', error);
      throw error;
    }
  }

  // 활성 세션 조회
  async getActiveSession(userId: string): Promise<PomodoroSession | null> {
    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active session:', error);
      throw error;
    }
  }

  // 사용자의 세션 목록 조회
  async getUserSessions(userId: string, limit: number = 50): Promise<PomodoroSession[]> {
    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }

  // 사용자 설정 조회 (캐싱 적용)
  async getUserSettings(userId: string): Promise<PomodoroSettings | null> {
    try {
      // 캐시 확인
      const cached = cacheService.get<PomodoroSettings>(cacheKeys.pomodoroSettings(userId));
      if (cached) {
        logger.debug('Pomodoro settings cache hit', { userId });
        return cached;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('pomodoro_settings')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      const settings = data?.pomodoro_settings || null;

      // 캐시 저장 (10분 - 설정은 자주 변경되지 않음)
      if (settings) {
        cacheService.set(cacheKeys.pomodoroSettings(userId), settings, 600);
      }

      return settings;
    } catch (error) {
      logger.error('Error fetching user settings', { userId, error });
      throw error;
    }
  }

  // 사용자 설정 업데이트 (캐시 무효화)
  async updateUserSettings(userId: string, settings: UpdatePomodoroSettingsRequest): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ pomodoro_settings: settings })
        .eq('user_id', userId);

      if (error) throw error;

      // 캐시 무효화 및 업데이트
      cacheService.del(cacheKeys.pomodoroSettings(userId));
      cacheService.set(cacheKeys.pomodoroSettings(userId), settings, 600);
    } catch (error) {
      logger.error('Error updating user settings', { userId, error });
      throw error;
    }
  }
}

export default new PomodoroRepository();
