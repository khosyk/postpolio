import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAuthUrl } from '@/config/api';
import { storageKeys } from '@/constants/storage';

interface User {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

interface VerifyResponseUser {
  id: string;
  email: string | null;
  nickname?: string | null;
}

interface VerifyResponse {
  success: boolean;
  data?: {
    user: VerifyResponseUser;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem(storageKeys.auth.accessToken);
      const storedRefreshToken = await AsyncStorage.getItem(storageKeys.auth.refreshToken);

      if (!storedUser || !storedToken) {
        setUser(null);
        return;
      }

      const parsedUser: User = JSON.parse(storedUser) as User;

      // 서버에 토큰 검증을 요청해서 만료 여부/유효성 확인
      const response = await fetch(getAuthUrl('VERIFY'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: storedToken }),
      });

      if (!response.ok) {
        // 토큰이 만료되었으면 refresh token으로 갱신 시도
        if (storedRefreshToken) {
          try {
            const refreshResponse = await fetch(getAuthUrl('REFRESH'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken: storedRefreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = (await refreshResponse.json()) as {
                success: boolean;
                data?: { accessToken: string; refreshToken: string };
              };

              if (refreshData.success && refreshData.data) {
                // 새 토큰 저장
                await AsyncStorage.setItem(storageKeys.auth.accessToken, refreshData.data.accessToken);
                await AsyncStorage.setItem(storageKeys.auth.refreshToken, refreshData.data.refreshToken);

                // 사용자 정보 유지
                setUser(parsedUser);
                return;
              }
            }
          } catch {
            // Refresh 실패는 아래에서 처리
          }
        }

        // Refresh token이 없거나 갱신 실패 시 로그인 상태 초기화
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem(storageKeys.auth.accessToken);
        await AsyncStorage.removeItem(storageKeys.auth.refreshToken);
        setUser(null);
        return;
      }

      const data = (await response.json()) as VerifyResponse;

      if (!data.success || !data.data?.user?.id) {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem(storageKeys.auth.accessToken);
        await AsyncStorage.removeItem(storageKeys.auth.refreshToken);
        setUser(null);
        return;
      }

      const verifiedUser = data.data.user;

      setUser({
        id: verifiedUser.id,
        email: verifiedUser.email ?? parsedUser.email,
        nickname: verifiedUser.nickname ?? parsedUser.nickname,
      });
    } catch {
      // 자동 로그인 체크 실패 시 조용히 세션만 초기화
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem(storageKeys.auth.accessToken);
      await AsyncStorage.removeItem(storageKeys.auth.refreshToken);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData: User, token: string, refreshToken?: string) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem(storageKeys.auth.accessToken, token);
      if (refreshToken) {
        await AsyncStorage.setItem(storageKeys.auth.refreshToken, refreshToken);
      }
      setUser(userData);
    } catch {
      // 로그인 정보 저장 실패 시 콘솔에만 남기고 무시
      // (실패해도 메모리 상의 로그인 상태는 유지)
    }
  };

  const logout = async () => {
    try {
      // 서버에 로그아웃 요청 (세션/리프레시 토큰 정리 목적, 실패해도 클라이언트는 계속 진행)
      try {
        await fetch(getAuthUrl('LOGOUT'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch {
        // 서버 로그아웃 실패는 클라이언트 세션 정리에 영향을 주지 않음
      }

      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem(storageKeys.auth.accessToken);
      await AsyncStorage.removeItem(storageKeys.auth.refreshToken);
      setUser(null);
    } catch {
      // 클라이언트 세션 정리 실패 시에도 앱이 크래시 되지 않도록 방어
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      void AsyncStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
