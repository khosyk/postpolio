/**
 * API 설정
 * 환경별 서버 URL 및 엔드포인트 관리
 */

const isDev = __DEV__;

export const API_CONFIG = {
  // 환경별 서버 URL
  BASE_URL: isDev
    ? 'http://localhost:4000'
    : process.env.EXPO_PUBLIC_API_URL || 'https://api.postpolio.com',

  // API 엔드포인트
  ENDPOINTS: {
    // 인증 관련
    AUTH: {
      SIGNUP: '/api/auth/signup',
      SIGNIN: '/api/auth/signin',
      VERIFY: '/api/auth/verify',
      PROFILE: '/api/auth/profile',
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
