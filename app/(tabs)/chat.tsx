import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getGroupUrl } from '@/config/api';
import { StudyGroup } from '@/types/group';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonGroupCard } from '@/components/Skeleton';

const ChatScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 그룹 목록 조회
  const fetchGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
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
        setGroups(data.data?.groups || []);
      }
    } catch {
      // 그룹 목록 조회 실패 시 무시
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchGroups();
    } else {
      setLoading(false);
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

  const handleGroupChatPress = (groupId: string, groupName: string) => {
    // TODO: 그룹별 채팅방으로 이동하는 로직 구현
    // 예: router.push(`/chat/${groupId}`)
    router.push({
      pathname: '/chat/[groupId]',
      params: { groupId, groupName },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>그룹별 채팅방</Text>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => (
            <SkeletonGroupCard key={i} />
          ))}
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>참여 중인 그룹이 없습니다.</Text>
          <Text style={styles.emptySubText}>그룹에 참여하여 채팅을 시작하세요.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() => handleGroupChatPress(item.id, item.name)}
              activeOpacity={0.7}
            >
              <View style={styles.groupCardContent}>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.groupDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.chatArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

export default ChatScreen;

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupInfo: {
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
  },
  chatArrow: {
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
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
