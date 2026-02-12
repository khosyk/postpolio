import statsRepository from '../repositories/statsRepository';
import { DailyStat, WeeklyStat, MonthlyStat, SummaryStat } from '../types';

/**
 * 통계 서비스
 * 비즈니스 로직 처리 및 데이터 통합
 */
class StatsService {
  /**
   * 일별 통계 조회
   */
  async getDailyStats(userId: string, startDate: string, endDate: string): Promise<DailyStat[]> {
    // 날짜 범위 검증 (최대 1년)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 365) {
      throw new Error('Date range cannot exceed 365 days');
    }

    if (daysDiff < 0) {
      throw new Error('Start date must be before end date');
    }

    return statsRepository.getDailyStats(userId, startDate, endDate);
  }

  /**
   * 주간 통계 조회
   * week 파라미터는 "YYYY-Www" 형식 또는 "YYYY-MM-DD" 형식
   */
  async getWeeklyStats(userId: string, week: string): Promise<WeeklyStat> {
    let weekStartDate: string;

    // "YYYY-Www" 형식 처리
    if (week.includes('W')) {
      const parts = week.split('-W');
      const yearStr = parts[0];
      const weekNumStr = parts[1];

      if (!yearStr || !weekNumStr) {
        throw new Error('Invalid week format. Expected "YYYY-Www" or "YYYY-MM-DD"');
      }

      const year = Number(yearStr);
      const weekNum = Number(weekNumStr);

      if (isNaN(year) || isNaN(weekNum)) {
        throw new Error('Invalid week format. Expected "YYYY-Www" or "YYYY-MM-DD"');
      }

      const date = new Date(year, 0, 1);
      const days = (weekNum - 1) * 7;
      date.setDate(date.getDate() + days - date.getDay());
      const isoString = date.toISOString().split('T')[0];
      if (!isoString) {
        throw new Error('Failed to convert date to ISO string');
      }
      weekStartDate = isoString;
    } else {
      // "YYYY-MM-DD" 형식 처리
      weekStartDate = week;
    }

    return statsRepository.getWeeklyStats(userId, weekStartDate);
  }

  /**
   * 월별 통계 조회
   */
  async getMonthlyStats(userId: string, year: number, month: number): Promise<MonthlyStat> {
    // 월 검증
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    if (year < 2000 || year > 2100) {
      throw new Error('Year must be between 2000 and 2100');
    }

    return statsRepository.getMonthlyStats(userId, year, month);
  }

  /**
   * 전체 요약 통계 조회
   */
  async getSummaryStats(userId: string): Promise<SummaryStat> {
    return statsRepository.getSummaryStats(userId);
  }
}

export default new StatsService();
