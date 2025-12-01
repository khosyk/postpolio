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
    } catch (error) {
      console.error('Error checking auth state:', error);
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
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('accessToken');
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
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
