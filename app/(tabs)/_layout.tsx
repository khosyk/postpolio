import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors, Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupUrl } from '@/config/api';
import { apiFetch } from '@/utils/apiClient';
import { useTheme } from '@/contexts/ThemeContext';

// 탭 레이아웃 컴포넌트
const TabLayout = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [hasGroups, setHasGroups] = useState(true); // 기본값은 true (로딩 중에는 표시)

  useEffect(() => {
    const checkGroups = async () => {
      if (!user) {
        setHasGroups(false);
        return;
      }

      try {
        const data = await apiFetch<{ data?: { groups?: { id: string }[] } }>(getGroupUrl('LIST'), {
          method: 'GET',
          requireAuth: true,
          // 실제 화면 쪽에서 한 번만 알럿을 띄우기 위해,
          // 탭 레이아웃에서의 자동 체크는 조용히 처리한다.
          showAuthErrorAlert: false,
        });
        const groups = data.data?.groups || [];
        setHasGroups(groups.length > 0);
      } catch {
        // 인증 실패 시 apiFetch 내부에서 로그인 화면으로 이동 처리
        setHasGroups(false);
      }
    };

    checkGroups();
  }, [user]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.background : colors.white,
      }}
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.blue500,
          tabBarInactiveTintColor: isDark ? colors.gray400 : colors.gray500,
          headerShown: false,
          tabBarButton: HapticTab,
          // 플랫폼 구분 없이 동일한 탭바 스타일 적용
          tabBarStyle: {
            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
            borderTopColor: isDark ? colors.gray700 : colors.gray200,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen
          name='index'
          options={{
            title: t('home.title'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name='home' color={color} />,
          }}
        />
        <Tabs.Screen
          name='explore'
          options={{
            title: t('groups.title'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name='group' color={color} />,
          }}
        />
        <Tabs.Screen
          name='stats'
          options={{
            title: t('stats.title'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name='bar-chart' color={color} />,
          }}
        />
        <Tabs.Screen
          name='pomodoro'
          options={{
            title: t('pomodoro.title'),
            tabBarIcon: ({ color }) => <IconSymbol size={24} name='timer' color={color} />,
          }}
        />
        <Tabs.Screen
          name='grades'
          options={{
            title: t('grades.title'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name='book' color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
};

export default TabLayout;
