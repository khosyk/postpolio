import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { getAuthUrl } from '@/config/api';
import { storageKeys } from '@/constants/storage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiFetchOptions extends RequestInit {
  method?: HttpMethod;
  /** 토큰이 반드시 필요한 요청인지 여부 (기본값: true) */
  requireAuth?: boolean;
  /** 인증 에러(401/403) 발생 시 자동으로 로그아웃 및 리다이렉트할지 여부 (기본값: true) */
  autoHandleAuthError?: boolean;
  /** 인증 에러 시 기본 경고(Alert)를 띄울지 여부 (기본값: true) */
  showAuthErrorAlert?: boolean;
}

interface ApiBaseResponse {
  success?: boolean;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class AuthError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

let hasShownAuthAlert = false;

/**
 * Refresh Token으로 Access Token 갱신
 */
const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshToken = await AsyncStorage.getItem(storageKeys.auth.refreshToken);
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(getAuthUrl('REFRESH'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const refreshData = (await response.json()) as {
      success: boolean;
      data?: { accessToken: string; refreshToken: string };
    };

    if (refreshData.success && refreshData.data) {
      await AsyncStorage.setItem(storageKeys.auth.accessToken, refreshData.data.accessToken);
      await AsyncStorage.setItem(storageKeys.auth.refreshToken, refreshData.data.refreshToken);
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * 공통 API 요청 헬퍼
 * - accessToken 자동 첨부
 * - 401/403 발생 시 refresh token으로 자동 갱신 시도
 * - 갱신 실패 시에만 로그아웃 처리
 * - 서버 응답 형식: { success, message, data } 가정
 */
export const apiFetch = async <TResponse = unknown>(
  url: string,
  args: ApiFetchOptions = {}
): Promise<TResponse> => {
  let token: string | null = null;

  const {
    method = 'GET',
    requireAuth = true,
    autoHandleAuthError = true,
    showAuthErrorAlert = true,
    headers,
    ...rest
  } = args;

  if (requireAuth) {
    token = await AsyncStorage.getItem(storageKeys.auth.accessToken);
    if (!token) {
      if (autoHandleAuthError) {
        await clearAuthAndRedirect();
      }
      throw new Error('인증 토큰이 없습니다.');
    }
  }

  let response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...rest,
  });

  let data = (await response.json().catch(() => undefined)) as ApiBaseResponse | undefined;

  // 인증 에러 공통 처리 - refresh token으로 갱신 시도
  if ((response.status === 401 || response.status === 403) && requireAuth) {
    // Refresh token으로 갱신 시도
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // 갱신 성공 시 새 토큰으로 재요청
      const newToken = await AsyncStorage.getItem(storageKeys.auth.accessToken);
      if (newToken) {
        response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...(headers || {}),
          },
          ...rest,
        });

        data = (await response.json().catch(() => undefined)) as ApiBaseResponse | undefined;

        // 재요청 후에도 에러가 발생하면 로그아웃 처리
        if (response.status === 401 || response.status === 403) {
          if (showAuthErrorAlert && !hasShownAuthAlert) {
            Alert.alert(
              '로그인이 필요합니다',
              data?.message || '세션이 만료되었습니다. 다시 로그인해주세요.'
            );
            hasShownAuthAlert = true;
          }

          if (autoHandleAuthError) {
            await clearAuthAndRedirect();
          }
          throw new AuthError(data?.message || '인증이 만료되었거나 유효하지 않습니다.');
        }
      }
    } else {
      // Refresh token이 없거나 갱신 실패 시 로그아웃 처리
      if (showAuthErrorAlert && !hasShownAuthAlert) {
        Alert.alert(
          '로그인이 필요합니다',
          data?.message || '세션이 만료되었습니다. 다시 로그인해주세요.'
        );
        hasShownAuthAlert = true;
      }

      if (autoHandleAuthError) {
        await clearAuthAndRedirect();
      }
      throw new AuthError(data?.message || '인증이 만료되었거나 유효하지 않습니다.');
    }
  }

  if (!response.ok || data?.success === false) {
    const msg = data?.message || '요청 처리 중 오류가 발생했습니다.';
    throw new Error(msg);
  }

  // 인증이 필요한 요청이 정상적으로 처리되면, 이후 인증 에러 발생 시 다시 알럿을 허용
  if (requireAuth) {
    hasShownAuthAlert = false;
  }

  return data as TResponse;
};

/**
 * 인증 상태 정리 및 로그인 화면으로 리다이렉트
 * - 서버 로그아웃 시도
 * - 로컬 스토리지 정리
 * - 로그인 화면으로 이동
 */
const clearAuthAndRedirect = async () => {
  try {
    const token = await AsyncStorage.getItem(storageKeys.auth.accessToken);
    if (token) {
      // 서버 로그아웃은 베스트 에포트; 실패해도 무시
      await fetch(getAuthUrl('LOGOUT'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined);
    }
  } catch {
    // 무시
  } finally {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem(storageKeys.auth.accessToken);
    await AsyncStorage.removeItem(storageKeys.auth.refreshToken);
    router.replace('/(auth)/login');
  }
};
