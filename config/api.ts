/**
 * API 설정
 * 환경별 서버 URL 및 엔드포인트 관리
 */
import { Platform } from 'react-native';

const isDev = __DEV__;
const isAndroid = Platform.OS === 'android';

export const API_CONFIG = {
  // 환경별 서버 URL
  BASE_URL: isDev
    ? isAndroid
      ? 'http://10.0.2.2:4000'
      : 'http://localhost:4000'
    : process.env.EXPO_PUBLIC_API_URL || 'https://api.postpolio.com',

  // API 엔드포인트
  ENDPOINTS: {
    // 인증 관련
    AUTH: {
      SIGNUP: '/api/auth/signup',
      SIGNIN: '/api/auth/signin',
      VERIFY: '/api/auth/verify',
      PROFILE: '/api/auth/profile',
      LOGOUT: '/api/auth/logout',
      WITHDRAW: '/api/auth/withdraw',
    },
    // 그룹 관련
    GROUPS: {
      LIST: '/api/groups',
      CREATE: '/api/groups',
      DETAIL: (id: string) => `/api/groups/${id}`,
      UPDATE: (id: string) => `/api/groups/${id}`,
      INVITE: (id: string) => `/api/groups/${id}/invite`,
      LEAVE: (id: string) => `/api/groups/${id}/leave`,
      DELETE: (id: string) => `/api/groups/${id}`,
    },
    // 메시지 관련
    MESSAGES: {
      LIST: (groupId: string) => `/api/groups/${groupId}/messages`,
    },
  },
} as const;

/**
 * 전체 API URL 생성 헬퍼
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * 인증 API URL 헬퍼
 */
export const getAuthUrl = (key: keyof typeof API_CONFIG.ENDPOINTS.AUTH): string => {
  return getApiUrl(API_CONFIG.ENDPOINTS.AUTH[key]);
};

/**
 * 그룹 API URL 헬퍼
 */
export const getGroupUrl = (key: keyof typeof API_CONFIG.ENDPOINTS.GROUPS, id?: string): string => {
  const endpoint = API_CONFIG.ENDPOINTS.GROUPS[key];
  if (typeof endpoint === 'function') {
    if (!id) throw new Error(`Group ID is required for ${key}`);
    return getApiUrl(endpoint(id));
  }
  return getApiUrl(endpoint);
};

/**
 * 메시지 API URL 헬퍼
 */
export const getMessageUrl = (groupId: string): string => {
  return getApiUrl(API_CONFIG.ENDPOINTS.MESSAGES.LIST(groupId));
};
