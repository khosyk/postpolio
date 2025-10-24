import { Server as SocketIOServer } from 'socket.io';
import { Message } from '../types';

// In-memory room state (demo only)
const roomIdToMessages = new Map<string, Message[]>(); // roomId -> message[]
const roomIdToUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>

// Helper to generate user info
const generateUserInfo = (socketId: string): { displayName: string; avatar: string } => {
  const adjectives = ['행복한', '즐거운', '친절한', '똑똑한', '용감한'];
  const nouns = ['사자', '호랑이', '코끼리', '기린', '펭귄'];
  const emojis = ['😀', '😎', '🤩', '🥳', '😇', '🚀', '💡', '🌟', '🌈', '🤖'];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  return {
    displayName: `${randomAdjective} ${randomNoun} ${socketId.slice(0, 4)}`,
    avatar: randomEmoji,
  };
};

export const setupSocketHandlers = (io: SocketIOServer) => {
  io.on('connection', socket => {
    console.log('client connected', socket.id);

    // Assign user info on connection
    const userInfo = generateUserInfo(socket.id);
    (socket.data as any).displayName = userInfo.displayName;
    (socket.data as any).avatar = userInfo.avatar;

    socket.on('join', (roomId: string) => {
      if (!roomId) return;
      socket.join(roomId);

      // track presence
      if (!roomIdToUsers.has(roomId)) roomIdToUsers.set(roomId, new Set());
      roomIdToUsers.get(roomId)?.add(socket.id);

      // send joined ACK + history to self
      const history = roomIdToMessages.get(roomId) ?? [];
      socket.emit('joined', {
        roomId,
        userId: socket.id,
        displayName: (socket.data as any).displayName,
        avatar: (socket.data as any).avatar,
        history,
      });

      // notify others in room
      socket.to(roomId).emit('system', {
        kind: 'join',
        userId: socket.id,
        displayName: (socket.data as any).displayName,
        avatar: (socket.data as any).avatar,
        roomId,
      });
    });

    socket.on('message', ({ roomId, text }: { roomId: string; text: string }) => {
      if (!roomId || !text) return;
      const payload: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        userId: socket.id,
        displayName: (socket.data as any).displayName,
        avatar: (socket.data as any).avatar,
        createdAt: new Date().toISOString(),
        type: 'message',
      };
      if (!roomIdToMessages.has(roomId)) roomIdToMessages.set(roomId, []);
      roomIdToMessages.get(roomId)?.push(payload);
      io.to(roomId).emit('message', payload);
    });

    socket.on('clearHistory', ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      roomIdToMessages.set(roomId, []);
      io.to(roomId).emit('historyCleared', { roomId, by: socket.id });
    });

    socket.on('leave', (roomId: string) => {
      if (!roomId) return;
      socket.leave(roomId);
      const users = roomIdToUsers.get(roomId);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) roomIdToUsers.delete(roomId);
      }
      socket.to(roomId).emit('system', {
        kind: 'leave',
        userId: socket.id,
        displayName: (socket.data as any).displayName,
        avatar: (socket.data as any).avatar,
        roomId,
      });
    });

    socket.on('disconnecting', () => {
      // notify all rooms this socket was in
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;
        const users = roomIdToUsers.get(roomId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) roomIdToUsers.delete(roomId);
        }
        socket.to(roomId).emit('system', { kind: 'leave', userId: socket.id, roomId });
      }
    });

    socket.on('disconnect', () => {
      console.log('client disconnected', socket.id);
    });
  });
};
