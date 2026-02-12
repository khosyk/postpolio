import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';
import { clientToServerEvents, serverToClientEvents } from '@/constants/socket';
import { storageKeys } from '@/constants/storage';

let socket: Socket | null = null;

/**
 * Socket.IO 클라이언트 연결
 */
export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  const token = await AsyncStorage.getItem(storageKeys.auth.accessToken);
  if (!token) {
    throw new Error('인증 토큰이 없습니다.');
  }

  socket = io(API_CONFIG.BASE_URL, {
    auth: {
      token,
    },
    transports: ['websocket'],
  });

  return socket;
};

/**
 * Socket.IO 클라이언트 연결 해제
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * 현재 Socket 인스턴스 반환
 */
export const getSocket = (): Socket | null => {
  return socket;
};
