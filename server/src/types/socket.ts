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
}

export interface InterServerEvents {}
