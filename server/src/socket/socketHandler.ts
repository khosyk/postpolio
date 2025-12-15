import { Server as SocketIOServer } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket';
import messageService from '../services/messageService';
import groupRepository from '../repositories/groupRepository';
import userRepository from '../repositories/userRepository';

// In-memory room state (실시간 사용자 추적용)
const roomIdToUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>

export const setupSocketHandlers = (
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) => {
  io.on('connection', async socket => {
    const userId = socket.data.userId;
    const email = socket.data.email;

    if (!userId) {
      console.error('Socket connected without userId');
      socket.disconnect();
      return;
    }

    console.log('client connected', socket.id, 'userId:', userId);

    // 사용자 프로필 로드
    let userProfile = null;
    try {
      userProfile = await userRepository.getUserProfile(userId);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }

    const displayName = userProfile?.nickname || email?.split('@')[0] || '알 수 없음';
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
        console.error('Error joining room:', error);
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

        // 메시지 생성 및 저장
        const message = await messageService.createMessage(roomId, userId, text);

        // 모든 클라이언트에 메시지 전송
        io.to(roomId).emit('message', message);
      } catch (error) {
        console.error('Error sending message:', error);
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

    socket.on('disconnect', () => {
      console.log('client disconnected', socket.id);
    });
  });
};
