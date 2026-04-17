import pomodoroRepository from '../repositories/pomodoroRepository';
import studyRepository from '../repositories/studyRepository';
import { PomodoroSession, PomodoroSettings, UpdatePomodoroSettingsRequest } from '../types';

class PomodoroService {
  // 공부 세션 started_at 기준 경과 시간(분) 계산
  private getElapsedMinutesFromStartedAt(startedAtIso: string): number {
    try {
      const startedAt = new Date(startedAtIso);
      const now = new Date();
      const diffMs = now.getTime() - startedAt.getTime();
      if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
      return Math.max(1, Math.round(diffMs / (1000 * 60)));
    } catch {
      return 0;
    }
  }

  // 세션 경과 시간(분) 계산
  private getElapsedMinutes(session: PomodoroSession): number {
    try {
      const startedAt = new Date(session.created_at);
      const now = new Date();
      const diffMs = now.getTime() - startedAt.getTime();
      if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
      // 1분 단위로 반올림하여 최소 1분은 인정
      const minutes = Math.round(diffMs / (1000 * 60));
      return Math.max(1, minutes);
    } catch {
      return 0;
    }
  }

  // DB 제약 위반 방지를 위해 저장 가능한 duration으로 정규화
  // - 실제 경과 시간(elapsed)
  // - 기존 세션 duration_minutes(사용자 설정값)
  // - 서버 스키마 상한(1440분)
  // 중 가장 보수적인 값으로 제한한다.
  private getSafeCompletedDurationMinutes(session: PomodoroSession): number {
    const elapsed = this.getElapsedMinutes(session);
    const sessionDuration = Math.max(1, Math.round(Number(session.duration_minutes) || 1));
    return Math.max(1, Math.min(elapsed, sessionDuration, 1440));
  }

  // 포모도로 세션 시작
  async startSession(userId: string, type: string, duration: number): Promise<PomodoroSession> {
    try {
      // 활성 공부 세션이 있으면 먼저 종료 처리 (사용자당 활성 공부 세션 1개 원칙)
      const activeStudySessions = await studyRepository.getActiveSessionsByUser(userId);
      for (const session of activeStudySessions) {
        const elapsedMinutes = this.getElapsedMinutesFromStartedAt(session.started_at);
        await studyRepository.updateSession(session.id, {
          ended_at: new Date().toISOString(),
          status: 'ended',
          total_minutes: elapsedMinutes,
        });
      }

      // 기존 활성 세션이 있으면 취소 처리
      const activeSession = await pomodoroRepository.getActiveSession(userId);
      if (activeSession) {
        // 이전 공부 세션은 경과 시간만큼 완료 처리, 휴식 세션은 취소
        if (activeSession.type === 'study') {
          const elapsedMinutes = this.getSafeCompletedDurationMinutes(activeSession);
          await pomodoroRepository.updateSession(activeSession.id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_minutes: elapsedMinutes,
          });
        } else {
        await pomodoroRepository.updateSession(activeSession.id, {
          status: 'cancelled',
          completed_at: null,
        });
        }
      }

      const safeDuration = Math.max(1, Math.min(1440, Math.round(Number(duration) || 1)));

      return await pomodoroRepository.createSession({
        userId,
        type,
        durationMinutes: safeDuration,
      });
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  // 세션 완료
  async completeSession(sessionId: string, userId: string): Promise<PomodoroSession> {
    try {
      const session = await pomodoroRepository.getActiveSession(userId);
      if (!session || session.id !== sessionId) {
        throw new Error('활성 세션을 찾을 수 없습니다.');
      }

      return await pomodoroRepository.updateSession(sessionId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  // 세션 취소
  async cancelSession(sessionId: string, userId: string): Promise<PomodoroSession> {
    try {
      const session = await pomodoroRepository.getActiveSession(userId);
      if (!session || session.id !== sessionId) {
        throw new Error('활성 세션을 찾을 수 없습니다.');
      }

      // 공부 세션은 취소 시점까지의 시간을 공부 시간으로 인정
      if (session.type === 'study') {
        const elapsedMinutes = this.getSafeCompletedDurationMinutes(session);
        return await pomodoroRepository.updateSession(sessionId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_minutes: elapsedMinutes,
        });
      }

      // 휴식 세션은 히스토리에 남기지 않고 취소 처리
      return await pomodoroRepository.updateSession(sessionId, {
        status: 'cancelled',
        completed_at: null,
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  }

  // 사용자 설정 조회
  async getUserSettings(userId: string): Promise<PomodoroSettings> {
    try {
      const settings = await pomodoroRepository.getUserSettings(userId);
      if (!settings) {
        // 기본 설정 반환
        return {
          study_duration: 25,
          break_duration: 5,
        };
      }
      return settings;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  }

  // 사용자 설정 업데이트
  async updateUserSettings(userId: string, settings: UpdatePomodoroSettingsRequest): Promise<void> {
    try {
      await pomodoroRepository.updateUserSettings(userId, settings);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  // 사용자 세션 목록 조회
  async getUserSessions(userId: string, limit: number = 50): Promise<PomodoroSession[]> {
    try {
      return await pomodoroRepository.getUserSessions(userId, limit);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }
}

export default new PomodoroService();
