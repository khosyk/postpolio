import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAuthUrl } from '@/config/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface VerifyResponseUser {
  id: string;
  email: string | null;
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
      const storedToken = await AsyncStorage.getItem('accessToken');

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
        // 토큰이 만료되었거나 유효하지 않으면 로그인 상태 초기화
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('accessToken');
        setUser(null);
        return;
      }

      const data = (await response.json()) as VerifyResponse;

      if (!data.success || !data.data?.user?.id) {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('accessToken');
        setUser(null);
        return;
      }

      const verifiedUser = data.data.user;

      setUser({
        id: verifiedUser.id,
        email: verifiedUser.email ?? parsedUser.email,
      });
    } catch {
      // 자동 로그인 체크 실패 시 조용히 세션만 초기화
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData: User, token: string) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('accessToken', token);
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
      await AsyncStorage.removeItem('accessToken');
      setUser(null);
    } catch {
      // 클라이언트 세션 정리 실패 시에도 앱이 크래시 되지 않도록 방어
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
