import pomodoroRepository from '../repositories/pomodoroRepository';
import { PomodoroSession, PomodoroSettings, UpdatePomodoroSettingsRequest } from '../types';

class PomodoroService {
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

  // 포모도로 세션 시작
  async startSession(userId: string, type: string, duration: number): Promise<PomodoroSession> {
    try {
      // 기존 활성 세션이 있으면 취소 처리
      const activeSession = await pomodoroRepository.getActiveSession(userId);
      if (activeSession) {
        // 이전 공부 세션은 경과 시간만큼 완료 처리, 휴식 세션은 취소
        if (activeSession.type === 'study') {
          const elapsedMinutes = this.getElapsedMinutes(activeSession);
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

      return await pomodoroRepository.createSession({
        userId,
        type,
        durationMinutes: duration,
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
        const elapsedMinutes = this.getElapsedMinutes(session);
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
