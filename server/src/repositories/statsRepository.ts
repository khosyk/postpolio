import supabase from '../supabaseClient';
import { DailyStat, WeeklyStat, MonthlyStat, SummaryStat } from '../types';

/**
 * 통계 데이터 Repository
 * study_sessions와 pomodoro_sessions 테이블에서 공부 시간 집계
 */
class StatsRepository {
  /**
   * 일별 통계 조회
   * study_sessions와 pomodoro_sessions를 합산
   */
  async getDailyStats(userId: string, startDate: string, endDate: string): Promise<DailyStat[]> {
    try {
      // study_sessions에서 그룹별 공부 시간 조회
      const { data: studySessions, error: studyError } = await supabase
        .from('study_sessions')
        .select('started_at, total_minutes')
        .eq('user_id', userId)
        .gte('started_at', `${startDate}T00:00:00Z`)
        .lte('started_at', `${endDate}T23:59:59Z`)
        .eq('status', 'ended');

      if (studyError) {
        console.error('Error fetching study sessions:', studyError);
        throw studyError;
      }

      // pomodoro_sessions에서 개인 포모도로 시간 조회 (type = 'study')
      const { data: pomodoroSessions, error: pomodoroError } = await supabase
        .from('pomodoro_sessions')
        .select('created_at, duration_minutes')
        .eq('user_id', userId)
        .eq('type', 'study')
        .eq('status', 'completed')
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      if (pomodoroError) {
        console.error('Error fetching pomodoro sessions:', pomodoroError);
        throw pomodoroError;
      }

      // 날짜별로 그룹화하여 합산
      const dailyMap = new Map<string, number>();

      // study_sessions 집계
      if (studySessions) {
        studySessions.forEach(session => {
          if (session.started_at) {
            const dateStr = new Date(session.started_at).toISOString().split('T')[0];
            if (dateStr) {
              const current = dailyMap.get(dateStr) || 0;
              dailyMap.set(dateStr, current + (session.total_minutes || 0));
            }
          }
        });
      }

      // pomodoro_sessions 집계
      if (pomodoroSessions) {
        pomodoroSessions.forEach(session => {
          if (session.created_at) {
            const dateStr = new Date(session.created_at).toISOString().split('T')[0];
            if (dateStr) {
              const current = dailyMap.get(dateStr) || 0;
              dailyMap.set(dateStr, current + (session.duration_minutes || 0));
            }
          }
        });
      }

      // DailyStat 배열로 변환
      const dailyStats: DailyStat[] = Array.from(dailyMap.entries())
        .map(([date, totalMinutes]) => ({
          date,
          totalMinutes,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return dailyStats;
    } catch (error) {
      console.error('Error in getDailyStats:', error);
      throw error;
    }
  }

  /**
   * 주간 통계 조회
   */
  async getWeeklyStats(userId: string, weekStartDate: string): Promise<WeeklyStat> {
    try {
      // 주의 시작일과 종료일 계산
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startDateStr = weekStart.toISOString().split('T')[0];
      const endDateStr = weekEnd.toISOString().split('T')[0];

      if (!startDateStr || !endDateStr) {
        throw new Error('Failed to convert dates to ISO string');
      }

      // 일별 통계 조회
      const dailyStats = await this.getDailyStats(userId, startDateStr, endDateStr);

      // 주간 총 시간 계산
      const totalMinutes = dailyStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);

      return {
        weekStart: startDateStr,
        weekEnd: endDateStr,
        totalMinutes,
        dailyStats,
      };
    } catch (error) {
      console.error('Error in getWeeklyStats:', error);
      throw error;
    }
  }

  /**
   * 월별 통계 조회
   */
  async getMonthlyStats(userId: string, year: number, month: number): Promise<MonthlyStat> {
    try {
      // 월의 시작일과 종료일 계산
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // 다음 달 0일 = 이번 달 마지막 날

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      if (!startDateStr || !endDateStr) {
        throw new Error('Failed to convert dates to ISO string');
      }

      // 일별 통계 조회
      const dailyStats = await this.getDailyStats(userId, startDateStr, endDateStr);

      // 월간 총 시간 계산
      const totalMinutes = dailyStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);

      return {
        year,
        month,
        totalMinutes,
        dailyStats,
      };
    } catch (error) {
      console.error('Error in getMonthlyStats:', error);
      throw error;
    }
  }

  /**
   * 전체 요약 통계 조회
   */
  async getSummaryStats(userId: string): Promise<SummaryStat> {
    try {
      // 전체 기간의 study_sessions 조회
      const { data: studySessions, error: studyError } = await supabase
        .from('study_sessions')
        .select('started_at, total_minutes')
        .eq('user_id', userId)
        .eq('status', 'ended');

      if (studyError) {
        console.error('Error fetching study sessions:', studyError);
        throw studyError;
      }

      // 전체 기간의 pomodoro_sessions 조회
      const { data: pomodoroSessions, error: pomodoroError } = await supabase
        .from('pomodoro_sessions')
        .select('created_at, duration_minutes')
        .eq('user_id', userId)
        .eq('type', 'study')
        .eq('status', 'completed');

      if (pomodoroError) {
        console.error('Error fetching pomodoro sessions:', pomodoroError);
        throw pomodoroError;
      }

      // 날짜별로 그룹화
      const dailyMap = new Map<string, number>();

      if (studySessions) {
        studySessions.forEach(session => {
          if (session.started_at) {
            const dateStr = new Date(session.started_at).toISOString().split('T')[0];
            if (dateStr) {
              const current = dailyMap.get(dateStr) || 0;
              dailyMap.set(dateStr, current + (session.total_minutes || 0));
            }
          }
        });
      }

      if (pomodoroSessions) {
        pomodoroSessions.forEach(session => {
          if (session.created_at) {
            const dateStr = new Date(session.created_at).toISOString().split('T')[0];
            if (dateStr) {
              const current = dailyMap.get(dateStr) || 0;
              dailyMap.set(dateStr, current + (session.duration_minutes || 0));
            }
          }
        });
      }

      // 통계 계산
      const totalDays = dailyMap.size;
      const totalMinutes = Array.from(dailyMap.values()).reduce((sum, minutes) => sum + minutes, 0);
      const averageMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
      const maxDailyMinutes = Math.max(...Array.from(dailyMap.values()), 0);

      return {
        totalDays,
        totalMinutes,
        averageMinutes,
        maxDailyMinutes,
      };
    } catch (error) {
      console.error('Error in getSummaryStats:', error);
      throw error;
    }
  }

  /**
   * 최대 일일 공부 시간 조회
   */
  async getMaxDailyStudyTime(userId: string, startDate: string, endDate: string): Promise<number> {
    try {
      const dailyStats = await this.getDailyStats(userId, startDate, endDate);
      if (dailyStats.length === 0) return 0;
      return Math.max(...dailyStats.map(stat => stat.totalMinutes));
    } catch (error) {
      console.error('Error in getMaxDailyStudyTime:', error);
      throw error;
    }
  }
}

export default new StatsRepository();
