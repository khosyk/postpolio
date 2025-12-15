import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { getGroupUrl } from '@/config/api';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [hasGroups, setHasGroups] = useState(true); // 기본값은 true (로딩 중에는 표시)

  useEffect(() => {
    const checkGroups = async () => {
      if (!user) {
        setHasGroups(false);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          setHasGroups(false);
          return;
        }

        const response = await fetch(getGroupUrl('LIST'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => undefined);
        if (response.ok && data?.success) {
          const groups = data.data?.groups || [];
          setHasGroups(groups.length > 0);
        } else {
          setHasGroups(false);
        }
      } catch {
        setHasGroups(false);
      }
    };

    checkGroups();
  }, [user]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name='index'
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name='home' color={color} />,
          }}
        />
        <Tabs.Screen
          name='explore'
          options={{
            title: 'Group',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name='send' color={color} />
            ),
            href: hasGroups ? undefined : null, // 그룹이 없으면 탭 숨김
          }}
        />
        <Tabs.Screen
          name='chat'
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name='chat' color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name='groups'
          options={{
            href: null, // 탭에서 숨김
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
