import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/i18n'; // i18n 초기화
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/contexts/AuthContext';
import { GroupProvider } from '@/contexts/GroupContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// 알림 핸들러 설정 (앱이 포그라운드여도 알림 표시)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// 내부 레이아웃 컴포넌트 (ThemeProvider 내부에서 사용)
const InnerLayout = () => {
  const { colorScheme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // 로컬 알림 권한 요청 (iOS)
    const requestPermissions = async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch {
        // 권한 요청 실패는 치명적이지 않으므로 무시
      }
    };

    void requestPermissions();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name='(auth)' options={{ headerShown: false }} />
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='groups' options={{ headerShown: false }} />
        <Stack.Screen name='chat' options={{ headerShown: false }} />
        <Stack.Screen name='grades' options={{ headerShown: false }} />
        <Stack.Screen name='profile' options={{ headerShown: false }} />
        <Stack.Screen name='+not-found' />
      </Stack>
      <StatusBar style='auto' />
    </NavigationThemeProvider>
  );
};

// 루트 레이아웃 컴포넌트
const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <GroupProvider>
          <ThemeProvider>
            <InnerLayout />
          </ThemeProvider>
        </GroupProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
