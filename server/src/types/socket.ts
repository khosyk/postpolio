import type { Message } from './index';

export interface SocketData {
  userId?: string;
  email?: string;
  displayName?: string;
  avatar?: string;
}

export interface ClientToServerEvents {
  join: (roomId: string) => void;
  message: (payload: { roomId: string; text: string }) => void;
  clearHistory: (payload: { roomId: string }) => void;
  leave: (roomId: string) => void;
  // 공부 세션 관련 (Phase 6)
  'study:start': (payload: { groupId: string }) => void;
  'study:stop': (payload: { groupId: string }) => void;
  'study:checkin:request': (payload: { groupId: string }) => void;
  'study:checkin:submit': (payload: { groupId: string; sessionId: string }) => void;
  'study:status': (payload: { groupId: string }) => void;
}

export interface ServerToClientEvents {
  joined: (payload: {
    roomId: string;
    userId: string;
    displayName: string;
    avatar: string;
    history: Message[];
  }) => void;
  system: (payload: {
    kind: 'join' | 'leave';
    userId: string;
    displayName?: string;
    avatar?: string;
    roomId: string;
  }) => void;
  message: (payload: Message) => void;
  error: (payload: { message: string }) => void;
  // 공부 세션 관련 (Phase 6)
  'study:checkin:request': (payload: {
    groupId: string;
    checkInInterval: number;
    activeSessions: string[];
  }) => void;
  'study:checkin:complete': (payload: {
    groupId: string;
    userId: string;
    sessionId: string;
    isValid: boolean;
  }) => void;
  'study:ranking:update': (payload: {
    groupId: string;
    ranking: Array<{
      userId: string;
      displayName: string;
      avatar: string;
      totalMinutes: number;
      rank: number;
    }>;
  }) => void;
  'study:time:update': (payload: {
    groupId: string;
    userId: string;
    totalMinutes: number;
    // 아래 필드는 선택값으로, 현재 활성 세션 상태를 표현할 때 사용
    hasActiveSession?: boolean;
    activeSessionStartedAt?: string | null;
  }) => void;
  'study:members:time:update': (payload: {
    groupId: string;
    members: Array<{
      userId: string;
      displayName: string;
      avatar: string;
      totalMinutes: number;
    }>;
  }) => void;
}

export interface InterServerEvents {}
