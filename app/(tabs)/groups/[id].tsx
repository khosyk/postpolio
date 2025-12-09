import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getGroupUrl } from '@/config/api';
import BlockingLoader from '@/components/BlockingLoader';
import { GroupWithMembers } from '@/types/group';
import { useAuth } from '@/contexts/AuthContext';

const GroupDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroup();
    }
  }, [id]);

  const fetchGroup = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(getGroupUrl('DETAIL', id), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => undefined);
      if (response.ok && data?.success) {
        setGroup(data.data?.group);
      } else {
        Alert.alert('오류', data?.message ?? '그룹 정보를 불러올 수 없습니다.');
        router.back();
      }
    } catch {
      Alert.alert('오류', '그룹 정보를 불러오는 중 오류가 발생했습니다.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    if (!id) return;
    Alert.alert('그룹 나가기', '정말 그룹에서 나가시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) {
              router.replace('/(auth)/login');
              return;
            }

            const response = await fetch(getGroupUrl('LEAVE', id), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });

            const data = await response.json().catch(() => undefined);
            if (response.ok && data?.success) {
              Alert.alert('완료', '그룹에서 나갔습니다.', [
                {
                  text: '확인',
                  onPress: () => router.back(),
                },
              ]);
            } else {
              Alert.alert('오류', data?.message ?? '그룹 나가기 중 오류가 발생했습니다.');
            }
          } catch {
            Alert.alert('오류', '그룹 나가기 중 오류가 발생했습니다.');
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('그룹 삭제', '정말 그룹을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) {
              router.replace('/(auth)/login');
              return;
            }

            const response = await fetch(getGroupUrl('DELETE', id), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });

            const data = await response.json().catch(() => undefined);
            if (response.ok && data?.success) {
              Alert.alert('완료', '그룹이 삭제되었습니다.', [
                {
                  text: '확인',
                  onPress: () => router.back(),
                },
              ]);
            } else {
              Alert.alert('오류', data?.message ?? '그룹 삭제 중 오류가 발생했습니다.');
            }
          } catch {
            Alert.alert('오류', '그룹 삭제 중 오류가 발생했습니다.');
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  const isOwner = group?.owner_id === user?.id;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.description ? (
              <Text style={styles.groupDescription}>{group.description}</Text>
            ) : null}
            <Text style={styles.groupDate}>
              생성일: {new Date(group.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>멤버 ({group.memberCount || 0}명)</Text>
            {group.members && group.members.length > 0 ? (
              <FlatList
                data={group.members}
                keyExtractor={item => `${item.group_id}-${item.user_id}`}
                renderItem={({ item }) => (
                  <View style={styles.memberItem}>
                    <Text style={styles.memberRole}>
                      {item.role === 'owner'
                        ? '👑 소유자'
                        : item.role === 'admin'
                          ? '⭐ 관리자'
                          : '👤 멤버'}
                    </Text>
                    <Text style={styles.memberDate}>
                      {new Date(item.joined_at).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                )}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>멤버가 없습니다.</Text>
            )}
          </View>

          <View style={styles.actions}>
            {isOwner ? (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>그룹 삭제</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                <Text style={styles.leaveButtonText}>그룹 나가기</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BlockingLoader
        visible={leaving}
        message={isOwner ? '그룹 삭제 중...' : '그룹 나가는 중...'}
      />
    </>
  );
};

export default GroupDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  groupDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  memberRole: {
    fontSize: 14,
    color: '#111827',
  },
  memberDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actions: {
    marginTop: 8,
  },
  leaveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
