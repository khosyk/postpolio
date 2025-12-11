import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getGroupUrl } from '@/config/api';
import { StudyGroup } from '@/types/group';
import { useAuth } from '@/contexts/AuthContext';

const ExploreScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 그룹 목록 조회
  const fetchGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(getGroupUrl('LIST'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => undefined);
      if (response.ok && data?.success) {
        setGroups(data.data?.groups || []);
      }
    } catch {
      // 그룹 목록 조회 실패 시 무시
    }
  };

  // 초기 로드
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  // 화면 포커스 시 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchGroups();
      }
    }, [user])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/(tabs)/groups/${groupId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>스터디 그룹 목록</Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 그룹이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() => handleGroupPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.groupCardContent}>
                <Text style={styles.groupName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.groupDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.groupDate}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </View>
              <Text style={styles.groupArrow}>›</Text>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    padding: 16,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupCardContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  groupDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  groupArrow: {
    fontSize: 24,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
