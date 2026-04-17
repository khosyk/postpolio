import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket';
import messageService from '../services/messageService';
import studyService from '../services/studyService';
import groupRepository from '../repositories/groupRepository';
import studyRepository from '../repositories/studyRepository';
import userRepository from '../repositories/userRepository';
import { logger } from '../utils/logger';

// In-memory room state (실시간 사용자 추적용)
const roomIdToUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>
const pendingCheckInByGroup = new Map<
  string,
  { expiresAt: number; checkInDurationSeconds: number; activeSessionIds: Set<string> }
>();

export const setupSocketHandlers = (
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) => {
  io.on('connection', async socket => {
    const userId = socket.data.userId;
    const email = socket.data.email;

    if (!userId) {
      logger.error('Socket connected without userId', { socketId: socket.id });
      socket.disconnect();
      return;
    }

    logger.info('Socket client connected', { socketId: socket.id, userId });

    // 사용자 프로필 로드
    let userProfile = null;
    try {
      userProfile = await userRepository.getUserProfile(userId);
    } catch (error) {
      logger.error('Error loading user profile', { userId, error });
    }

    const rawName = userProfile?.nickname || email?.split('@')[0] || '알 수 없음';
    const displayName = rawName.length > 8 ? rawName.slice(0, 8) : rawName;
    const avatar = userProfile?.avatar || '👤';

    socket.data.displayName = displayName;
    socket.data.avatar = avatar;

    socket.on('join', async (roomId: string) => {
      if (!roomId || !userId) return;

      try {
        // 그룹 멤버인지 확인
        const isMember = await groupRepository.isMember(roomId, userId);
        if (!isMember) {
          socket.emit('error', { message: '그룹 멤버만 채팅방에 입장할 수 있습니다.' });
          return;
        }

        socket.join(roomId);

        // track presence
        if (!roomIdToUsers.has(roomId)) roomIdToUsers.set(roomId, new Set());
        roomIdToUsers.get(roomId)?.add(userId);

        // 메시지 히스토리 조회
        const history = await messageService.getGroupMessages(roomId, userId, 100, 0);

        // send joined ACK + history to self
        socket.emit('joined', {
          roomId,
          userId,
          displayName,
          avatar,
          history,
        });

        // notify others in room
        socket.to(roomId).emit('system', {
          kind: 'join',
          userId,
          displayName,
          avatar,
          roomId,
        });
      } catch (error) {
        logger.error('Error joining room', { roomId, userId, error });
        socket.emit('error', { message: '채팅방 입장 중 오류가 발생했습니다.' });
      }
    });

    socket.on('message', async ({ roomId, text }: { roomId: string; text: string }) => {
      if (!roomId || !text || !userId) return;

      try {
        // 그룹 멤버인지 확인
        const isMember = await groupRepository.isMember(roomId, userId);
        if (!isMember) {
          socket.emit('error', { message: '그룹 멤버만 메시지를 전송할 수 있습니다.' });
          return;
        }

        // 그룹 정보 조회 및 chat_enabled 확인
        const group = await groupRepository.getGroupById(roomId);
        if (!group) {
          socket.emit('error', { message: '그룹을 찾을 수 없습니다.' });
          return;
        }

        if (!group.chat_enabled) {
          socket.emit('error', { message: '이 그룹의 채팅이 비활성화되어 있습니다.' });
          return;
        }

        // 메시지 생성 및 저장
        const message = await messageService.createMessage(roomId, userId, text);

        // 모든 클라이언트에 메시지 전송
        io.to(roomId).emit('message', message);
      } catch (error) {
        logger.error('Error sending message', { roomId, userId, error });
        socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
      }
    });

    socket.on('leave', (roomId: string) => {
      if (!roomId || !userId) return;
      socket.leave(roomId);
      const users = roomIdToUsers.get(roomId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) roomIdToUsers.delete(roomId);
      }
      socket.to(roomId).emit('system', {
        kind: 'leave',
        userId,
        displayName,
        avatar,
        roomId,
      });
    });

    socket.on('disconnecting', () => {
      // notify all rooms this socket was in
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;
        const users = roomIdToUsers.get(roomId);
        if (users && userId) {
          users.delete(userId);
          if (users.size === 0) roomIdToUsers.delete(roomId);
        }
        if (userId) {
          socket.to(roomId).emit('system', {
            kind: 'leave',
            userId,
            displayName,
            avatar,
            roomId,
          });
        }
      }
    });

    // 공부 세션 시작 (Phase 6)
    socket.on('study:start', async ({ groupId }: { groupId: string }) => {
      if (!groupId || !userId) return;

      try {
        await studyService.startStudySession(groupId, userId);
        socket.emit('study:time:update', {
          groupId,
          userId,
          totalMinutes: 0,
        });

        // 랭킹 업데이트
        const ranking = await studyService.getTop5Ranking(groupId);
        io.to(groupId).emit('study:ranking:update', {
          groupId,
          ranking,
        });

        // 그룹 멤버들의 공부시간 업데이트 (그룹 챗 탭용)
        try {
          const membersStudyTime = await studyService.getGroupMembersStudyTime(groupId, userId);
          io.to(groupId).emit('study:members:time:update', {
            groupId,
            members: membersStudyTime,
          });
        } catch (error) {
          logger.error('Error updating group members study time', { groupId, error });
        }
      } catch (error) {
        logger.error('Error starting study session', { groupId, userId, error });
        socket.emit('error', {
          message:
            error instanceof Error ? error.message : '공부 세션 시작 중 오류가 발생했습니다.',
        });
      }
    });

    // 공부 세션 종료 (Phase 6)
    socket.on('study:stop', async ({ groupId }: { groupId: string }) => {
      if (!groupId || !userId) return;

      try {
        const session = await studyService.stopStudySession(groupId, userId);
        socket.emit('study:time:update', {
          groupId,
          userId,
          totalMinutes: session?.total_minutes || 0,
        });

        // 랭킹 업데이트
        const ranking = await studyService.getTop5Ranking(groupId);
        io.to(groupId).emit('study:ranking:update', {
          groupId,
          ranking,
        });

        // 그룹 멤버들의 공부시간 업데이트 (그룹 챗 탭용)
        try {
          const membersStudyTime = await studyService.getGroupMembersStudyTime(groupId, userId);
          io.to(groupId).emit('study:members:time:update', {
            groupId,
            members: membersStudyTime,
          });
        } catch (error) {
          logger.error('Error updating group members study time', { groupId, error });
        }
      } catch (error) {
        logger.error('Error stopping study session', { groupId, userId, error });
        socket.emit('error', {
          message:
            error instanceof Error ? error.message : '공부 세션 종료 중 오류가 발생했습니다.',
        });
      }
    });

    // 방장이 체크인 요청 (Phase 6)
    socket.on('study:checkin:request', async ({ groupId }: { groupId: string }) => {
      if (!groupId || !userId) return;

      try {
        const result = await studyService.requestCheckIn(groupId, userId);
        const expiresAt = Date.now() + result.checkInDurationSeconds * 1000;
        pendingCheckInByGroup.set(groupId, {
          expiresAt,
          checkInDurationSeconds: result.checkInDurationSeconds,
          activeSessionIds: new Set(result.activeSessions),
        });

        // 방에 연결된 각 소켓별로 활성 세션 ID를 붙여 전송 (클라이언트가 정확히 제출 가능)
        const roomSockets = await io.in(groupId).fetchSockets();
        await Promise.all(
          roomSockets.map(async remote => {
            const uid = remote.data.userId;
            if (!uid) return;
            const activeSession = await studyRepository.getActiveSession(groupId, uid);
            if (!activeSession || !result.activeSessions.includes(activeSession.id)) return;
            remote.emit('study:checkin:request', {
              groupId: result.groupId,
              checkInInterval: result.checkInInterval,
              checkInDurationSeconds: result.checkInDurationSeconds,
              remainingSeconds: result.checkInDurationSeconds,
              activeSessions: result.activeSessions,
              activeSessionId: activeSession.id,
            });
          })
        );
      } catch (error) {
        logger.error('Error requesting check-in', { groupId, userId, error });
        socket.emit('error', {
          message: error instanceof Error ? error.message : '체크인 요청 중 오류가 발생했습니다.',
        });
      }
    });

    // 체크인 버튼 클릭 (Phase 6)
    socket.on(
      'study:checkin:submit',
      async ({ groupId, sessionId }: { groupId: string; sessionId?: string }) => {
        if (!groupId || !userId) return;

        try {
          const result = await studyService.submitCheckIn(groupId, userId, sessionId);

          // 모든 멤버에게 체크인 완료 알림
          io.to(groupId).emit('study:checkin:complete', {
            groupId,
            userId,
            sessionId: result.sessionId ?? sessionId ?? '',
            isValid: result.isValid,
          });

          // 제출 완료된 사용자의 세션은 pending 집합에서 제거
          const pending = pendingCheckInByGroup.get(groupId);
          if (pending && result.sessionId) {
            pending.activeSessionIds.delete(result.sessionId);
            if (pending.activeSessionIds.size === 0 || pending.expiresAt <= Date.now()) {
              pendingCheckInByGroup.delete(groupId);
            } else {
              pendingCheckInByGroup.set(groupId, pending);
            }
          }

          // 체크인 검증 실패로 세션이 종료된 경우, 해당 사용자 UI를 즉시 동기화
          if (result.sessionEnded) {
            socket.emit('study:time:update', {
              groupId,
              userId,
              totalMinutes: result.totalMinutes ?? 0,
              hasActiveSession: false,
              activeSessionStartedAt: null,
            });
          }

          // 랭킹 업데이트
          const ranking = await studyService.getTop5Ranking(groupId);
          io.to(groupId).emit('study:ranking:update', {
            groupId,
            ranking,
          });
        } catch (error) {
          logger.error('Error submitting check-in', { groupId, userId, sessionId, error });
          socket.emit('error', {
            message: error instanceof Error ? error.message : '체크인 중 오류가 발생했습니다.',
          });
        }
      }
    );

    // 공부 상태 조회 (Phase 6)
    socket.on('study:status', async ({ groupId }: { groupId: string }) => {
      if (!groupId || !userId) return;

      try {
        // 랭킹 / 오늘 통계 / 현재 활성 세션 / 그룹 멤버 공부시간을 한 번에 조회
        const [ranking, status, membersStudyTime] = await Promise.all([
          studyService.getTop5Ranking(groupId),
          studyService.getUserStudyStatus(groupId, userId),
          studyService.getGroupMembersStudyTime(groupId, userId),
        ]);

        // 내 랭킹 / 오늘 공부시간 / 활성 세션 상태 응답
        socket.emit('study:ranking:update', {
          groupId,
          ranking,
        });

        socket.emit('study:time:update', {
          groupId,
          userId,
          totalMinutes: status.totalMinutes,
          hasActiveSession: status.hasActiveSession,
          activeSessionStartedAt: status.activeSessionStartedAt,
        });

        // 체크인 요청이 진행 중이고, 아직 제출하지 않은 사용자라면 재진입 시 체크인 UI 복원
        const pending = pendingCheckInByGroup.get(groupId);
        if (pending && status.hasActiveSession) {
          const remainingSeconds = Math.floor((pending.expiresAt - Date.now()) / 1000);
          if (remainingSeconds > 0) {
            const group = await groupRepository.getGroupById(groupId);
            const activeSession = await studyRepository.getActiveSession(groupId, userId);
            if (activeSession && pending.activeSessionIds.has(activeSession.id)) {
              const alreadyChecked = await studyRepository.hasCheckInRecord(activeSession.id, userId);
              if (!alreadyChecked) {
                socket.emit('study:checkin:request', {
                  groupId,
                  checkInInterval: group?.check_in_interval ?? 30,
                  checkInDurationSeconds: pending.checkInDurationSeconds,
                  remainingSeconds,
                  activeSessions: Array.from(pending.activeSessionIds),
                  activeSessionId: activeSession.id,
                });
              }
            }
          } else {
            pendingCheckInByGroup.delete(groupId);
          }
        }

        // 그룹 멤버들의 공부시간 (그룹 챗 탭 및 방 상단 요약용)
        socket.emit('study:members:time:update', {
          groupId,
          members: membersStudyTime,
        });
      } catch (error) {
        logger.error('Error fetching study status', { groupId, userId, error });
        socket.emit('error', {
          message: '공부 상태 조회 중 오류가 발생했습니다.',
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket client disconnected', { socketId: socket.id, userId });
    });
  });
};
