import studyRepository from '../repositories/studyRepository';
import groupRepository from '../repositories/groupRepository';
import userRepository from '../repositories/userRepository';
import pomodoroRepository from '../repositories/pomodoroRepository';
import { RankingEntry } from '../types';

class StudyService {
  private getElapsedMinutes(startedAt: string): number {
    const started = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - started.getTime();
    if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.max(1, Math.round(diffMs / (1000 * 60)));
  }

  // 공부 세션 시작
  async startStudySession(groupId: string, userId: string) {
    // 그룹 멤버인지 확인
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) {
      throw new Error('그룹 멤버만 공부 세션을 시작할 수 있습니다.');
    }

    // 기존 활성 세션이 있는지 확인
    const existingSession = await studyRepository.getActiveSession(groupId, userId);
    if (existingSession) {
      // 이미 활성 세션이 있는 경우 에러 대신 기존 세션을 반환하여
      // 클라이언트에서 재시작 시에도 부드럽게 동작하도록 처리
      return existingSession;
    }

    // 다른 그룹에서 활성화된 기존 공부 세션이 있으면 종료 처리
    const activeStudySessions = await studyRepository.getActiveSessionsByUser(userId);
    const otherGroupSessions = activeStudySessions.filter(session => session.group_id !== groupId);
    for (const session of otherGroupSessions) {
      const elapsedMinutes = this.getElapsedMinutes(session.started_at);
      await studyRepository.updateSession(session.id, {
        ended_at: new Date().toISOString(),
        status: 'ended',
        total_minutes: elapsedMinutes,
      });
    }

    // 활성 포모도로 세션이 있으면 먼저 정리하여 "공부 세션 1개" 원칙 유지
    const activePomodoro = await pomodoroRepository.getActiveSession(userId);
    if (activePomodoro) {
      if (activePomodoro.type === 'study') {
        const elapsedMinutes = this.getElapsedMinutes(activePomodoro.created_at);
        const safeMinutes = Math.max(
          1,
          Math.min(
            elapsedMinutes,
            Math.max(1, Math.round(Number(activePomodoro.duration_minutes) || 1)),
            1440
          )
        );
        await pomodoroRepository.updateSession(activePomodoro.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_minutes: safeMinutes,
        });
      } else {
        await pomodoroRepository.updateSession(activePomodoro.id, {
          status: 'cancelled',
          completed_at: null,
        });
      }
    }

    // 새 세션 생성
    return await studyRepository.createSession({
      group_id: groupId,
      user_id: userId,
    });
  }

  // 공부 세션 종료
  async stopStudySession(groupId: string, userId: string) {
    const session = await studyRepository.getActiveSession(groupId, userId);
    if (!session) {
      throw new Error('활성 세션이 없습니다.');
    }

    // 그룹 정보 조회 (체크인 간격 확인용)
    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }

    // 인정된 공부 시간 계산
    const validMinutes = await studyRepository.calculateValidStudyTime(
      session.id,
      group.check_in_interval
    );

    // 체크인 기반 인정 시간이 0인 경우에도
    // 시작 시점부터 종료 시점까지의 최소 시간을 공부 시간으로 인정
    let totalMinutes = validMinutes;
    if (totalMinutes === 0) {
      try {
        const startedAt = new Date(session.started_at);
        const now = new Date();
        const diffMs = now.getTime() - startedAt.getTime();
        if (!Number.isNaN(diffMs) && diffMs > 0) {
          totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
        }
      } catch {
        totalMinutes = 0;
      }
    }

    // 세션 종료
    return await studyRepository.updateSession(session.id, {
      ended_at: new Date().toISOString(),
      status: 'ended',
      total_minutes: totalMinutes,
    });
  }

  // 방장이 체크인 요청 (방장만 가능)
  async requestCheckIn(groupId: string, ownerId: string) {
    // 그룹 정보 조회
    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }

    // 방장인지 확인
    if (group.owner_id !== ownerId) {
      throw new Error('방장만 체크인을 요청할 수 있습니다.');
    }

    // 그룹의 모든 활성 세션 조회
    const activeSessions = await studyRepository.getActiveSessionsByGroup(groupId);

    const checkInDurationSeconds = group.check_in_duration_seconds ?? 30;

    return {
      groupId,
      activeSessions: activeSessions.map(s => s.id),
      checkInInterval: group.check_in_interval,
      checkInDurationSeconds,
    };
  }

  // 체크인 버튼 클릭 처리
  async submitCheckIn(groupId: string, userId: string, sessionId?: string) {
    // 세션 확인
    const session = await studyRepository.getActiveSession(groupId, userId);
    if (!session) {
      throw new Error('유효한 세션을 찾을 수 없습니다.');
    }
    if (sessionId && session.id !== sessionId) {
      throw new Error('유효한 세션을 찾을 수 없습니다.');
    }

    const sid = session.id;

    // 그룹 정보 조회
    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }

    // 방장이 먼저 체크인했는지 확인
    const ownerCheckIn = await studyRepository.getValidCheckIns(sid);
    const ownerSession = await studyRepository.getActiveSession(groupId, group.owner_id);
    const ownerHasCheckedIn =
      ownerSession &&
      ownerCheckIn.some(checkIn => checkIn.user_id === group.owner_id && checkIn.is_valid);

    // 방장이 먼저 체크인하지 않았으면 유효하지 않음
    const isValid = ownerHasCheckedIn || userId === group.owner_id;

    // 체크인 기록 생성
    await studyRepository.createCheckInRecord({
      session_id: sid,
      user_id: userId,
      group_id: groupId,
      is_valid: isValid,
    });

    // 공부 증명(체크인) 검증 실패 시 현재 활성 세션을 즉시 종료
    if (!isValid) {
      const validMinutes = await studyRepository.calculateValidStudyTime(
        sid,
        group.check_in_interval
      );

      await studyRepository.updateSession(sid, {
        ended_at: new Date().toISOString(),
        status: 'ended',
        total_minutes: validMinutes,
      });

      const todayStats = await studyRepository.getTodayStats(groupId, userId);
      return {
        success: true,
        isValid,
        sessionId: session.id,
        sessionEnded: true,
        totalMinutes: todayStats.totalMinutes,
        message: '공부 증명 확인에 실패하여 현재 공부 세션이 종료되었습니다.',
      };
    }

    return {
      success: true,
      isValid,
      sessionId: session.id,
      sessionEnded: false,
      message: isValid ? '체크인 완료' : '방장이 먼저 체크인해야 합니다.',
    };
  }

  // Top 5 랭킹 조회 (배치 처리로 N+1 문제 해결)
  async getTop5Ranking(groupId: string): Promise<RankingEntry[]> {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!todayStr) {
      throw new Error('Failed to get today date');
    }
    const sessions = await studyRepository.getTop5Ranking(groupId, todayStr);

    if (sessions.length === 0) return [];

    // 모든 userId 수집
    const userIds = sessions.map(s => s.user_id).filter((id): id is string => !!id);

    // 배치 조회로 N+1 문제 해결
    const profiles = await userRepository.getUserProfilesBatch(userIds);
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    // 랭킹 생성
    return sessions.map((session, index) => {
      const profile = profileMap.get(session.user_id);
      return {
        userId: session.user_id,
        displayName: profile?.nickname || '알 수 없음',
        avatar: profile?.avatar || '👤',
        totalMinutes: session.total_minutes || 0,
        rank: index + 1,
      };
    });
  }

  // 오늘의 통계 조회
  async getTodayStats(groupId: string, userId: string) {
    return await studyRepository.getTodayStats(groupId, userId);
  }

  // 그룹 멤버들의 오늘 공부시간 조회 (그룹 챗 탭용)
  async getGroupMembersStudyTime(groupId: string, userId: string) {
    // 그룹 멤버인지 확인
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) {
      throw new Error('그룹 멤버만 조회할 수 있습니다.');
    }

    // 그룹 멤버 목록 조회
    const members = await groupRepository.getGroupMembers(groupId);
    if (members.length === 0) return [];

    // 멤버들의 userId 추출
    const userIds = members.map(m => m.user_id);

    // 배치 처리: 사용자 프로필 조회
    const profiles = await userRepository.getUserProfilesBatch(userIds);
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    // 배치 처리: 오늘 공부시간 조회
    const studyTimeMap = await studyRepository.getGroupMembersTodayStats(groupId, userIds);

    // 결과 조합
    return members.map(member => {
      const profile = profileMap.get(member.user_id);
      return {
        userId: member.user_id,
        displayName: profile?.nickname || '알 수 없음',
        avatar: profile?.avatar || '👤',
        totalMinutes: studyTimeMap.get(member.user_id) || 0,
      };
    });
  }

  /**
   * 특정 그룹에서 사용자의 오늘 공부 현황 + 활성 세션 정보를 함께 조회
   * - 오늘 누적 인정 공부 시간
   * - 현재 활성 세션 존재 여부
   * - 활성 세션 시작 시각
   */
  async getUserStudyStatus(groupId: string, userId: string) {
    // 그룹 멤버인지 먼저 확인
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) {
      throw new Error('그룹 멤버만 조회할 수 있습니다.');
    }

    const [todayStats, activeSession] = await Promise.all([
      studyRepository.getTodayStats(groupId, userId),
      studyRepository.getActiveSession(groupId, userId),
    ]);

    return {
      totalMinutes: todayStats.totalMinutes,
      hasActiveSession: !!activeSession,
      activeSessionStartedAt: activeSession?.started_at ?? null,
    };
  }

  // 데일리 진행 상황 조회 (24시간 기준)
  async getDailyProgress(groupId: string) {
    const activeSessions = await studyRepository.getActiveSessionsByGroup(groupId);
    const group = await groupRepository.getGroupById(groupId);

    if (!group) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }

    if (activeSessions.length === 0) return [];

    // 배치 처리: 모든 사용자 프로필 한 번에 조회
    const userIds = activeSessions.map(s => s.user_id);
    const profiles = await userRepository.getUserProfilesBatch(userIds);
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    // 각 세션의 체크인 및 시간 계산
    const progress = [];
    for (const session of activeSessions) {
      const userProfile = profileMap.get(session.user_id);
      const checkIns = await studyRepository.getValidCheckIns(session.id);
      const validMinutes = await studyRepository.calculateValidStudyTime(
        session.id,
        group.check_in_interval
      );

      progress.push({
        userId: session.user_id,
        displayName: userProfile?.nickname || '알 수 없음',
        avatar: userProfile?.avatar || '👤',
        totalMinutes: validMinutes,
        checkInCount: checkIns.length,
      });
    }

    return progress;
  }
}

export default new StudyService();
