import supabase from '../supabaseClient';
import { StudySession, CheckInRecord } from '../types';
import { logger } from '../utils/logger';

class StudyRepository {
  // 공부 세션 생성
  async createSession(sessionData: {
    group_id: string;
    user_id: string;
    started_at?: string;
  }): Promise<StudySession> {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([
          {
            group_id: sessionData.group_id,
            user_id: sessionData.user_id,
            started_at: sessionData.started_at || new Date().toISOString(),
            status: 'active',
            total_minutes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating study session:', error);
      throw error;
    }
  }

  // 세션 업데이트
  async updateSession(
    sessionId: string,
    updates: {
      ended_at?: string;
      status?: 'active' | 'paused' | 'ended';
      total_minutes?: number;
    }
  ): Promise<StudySession | null> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      const updatesRecord = updates as Record<string, unknown>;
      if (updatesRecord['ended_at'] !== undefined)
        updateData['ended_at'] = updatesRecord['ended_at'];
      if (updatesRecord['status'] !== undefined) updateData['status'] = updatesRecord['status'];
      if (updatesRecord['total_minutes'] !== undefined)
        updateData['total_minutes'] = updatesRecord['total_minutes'];

      const { data, error } = await supabase
        .from('study_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error updating study session:', error);
      throw error;
    }
  }

  // 활성 세션 조회 (그룹 + 사용자)
  async getActiveSession(groupId: string, userId: string): Promise<StudySession | null> {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active session:', error);
      throw error;
    }
  }

  // 그룹의 모든 활성 세션 조회
  async getActiveSessionsByGroup(groupId: string): Promise<StudySession[]> {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active sessions by group:', error);
      throw error;
    }
  }

  // Top 5 랭킹 조회 (특정 날짜)
  async getTop5Ranking(groupId: string, date: string): Promise<StudySession[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('group_id', groupId)
        .gte('started_at', startOfDay.toISOString())
        .lte('started_at', endOfDay.toISOString())
        .order('total_minutes', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching top 5 ranking:', error);
      throw error;
    }
  }

  // 체크인 기록 생성
  async createCheckInRecord(checkInData: {
    session_id: string;
    user_id: string;
    group_id: string;
    checked_at?: string;
    is_valid?: boolean;
  }): Promise<CheckInRecord> {
    try {
      const { data, error } = await supabase
        .from('check_in_records')
        .insert([
          {
            session_id: checkInData.session_id,
            user_id: checkInData.user_id,
            group_id: checkInData.group_id,
            checked_at: checkInData.checked_at || new Date().toISOString(),
            is_valid: checkInData.is_valid !== undefined ? checkInData.is_valid : true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating check-in record:', error);
      throw error;
    }
  }

  // 세션의 유효한 체크인 목록 조회
  async getValidCheckIns(sessionId: string): Promise<CheckInRecord[]> {
    try {
      const { data, error } = await supabase
        .from('check_in_records')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_valid', true)
        .order('checked_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching valid check-ins:', error);
      throw error;
    }
  }

  // 인정된 공부 시간 계산 (체크인 간격 기반)
  async calculateValidStudyTime(
    sessionId: string,
    checkInIntervalMinutes: number
  ): Promise<number> {
    try {
      const checkIns = await this.getValidCheckIns(sessionId);
      if (checkIns.length === 0) return 0;

      // 체크인 간격으로 인정된 시간 계산
      // 첫 체크인부터 마지막 체크인까지의 시간을 체크인 간격으로 나눔
      const firstCheckInData = checkIns[0];
      const lastCheckInData = checkIns[checkIns.length - 1];
      if (!firstCheckInData || !lastCheckInData) return 0;

      const firstCheckIn = new Date(firstCheckInData.checked_at);
      const lastCheckIn = new Date(lastCheckInData.checked_at);
      const totalMinutes = Math.floor(
        (lastCheckIn.getTime() - firstCheckIn.getTime()) / (1000 * 60)
      );

      // 체크인 간격 단위로 반올림
      return Math.floor(totalMinutes / checkInIntervalMinutes) * checkInIntervalMinutes;
    } catch (error) {
      console.error('Error calculating valid study time:', error);
      throw error;
    }
  }

  // 오늘의 통계 조회
  async getTodayStats(groupId: string, userId: string): Promise<{ totalMinutes: number }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('total_minutes')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .eq('status', 'ended');

      if (error) throw error;

      const totalMinutes = (data || []).reduce(
        (sum, session) => sum + (session.total_minutes || 0),
        0
      );
      return { totalMinutes };
    } catch (error) {
      logger.error('Error fetching today stats', { groupId, userId, error });
      throw error;
    }
  }

  // 그룹 멤버들의 오늘 공부시간 조회 (배치 처리)
  async getGroupMembersTodayStats(groupId: string, userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('user_id, total_minutes')
        .eq('group_id', groupId)
        .in('user_id', userIds)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .eq('status', 'ended');

      if (error) throw error;

      // 사용자별로 합산
      const statsMap = new Map<string, number>();
      
      // 모든 사용자 초기화 (공부시간 0분도 포함)
      userIds.forEach(userId => {
        statsMap.set(userId, 0);
      });

      // 세션 데이터 집계
      (data || []).forEach(session => {
        const current = statsMap.get(session.user_id) || 0;
        statsMap.set(session.user_id, current + (session.total_minutes || 0));
      });

      return statsMap;
    } catch (error) {
      console.error('Error fetching group members today stats:', error);
      throw error;
    }
  }
}

export default new StudyRepository();
