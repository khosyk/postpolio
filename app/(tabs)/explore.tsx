import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
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
import BlockingLoader from '@/components/BlockingLoader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SkeletonGroupCard } from '@/components/Skeleton';

const ExploreScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

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

  const handleGroupPress = (groupId: string) => {
    router.push(`/(tabs)/groups/${groupId}`);
  };

  const handleGroupSettings = (group: StudyGroup, event: any) => {
    event.stopPropagation();
    setSelectedGroup(group);
    setMenuVisible(true);
  };

  const handleEditGroup = () => {
    if (!selectedGroup) return;
    setMenuVisible(false);
    // TODO: 그룹 편집 화면 구현
    Alert.alert('알림', '그룹 편집 기능은 준비 중입니다.');
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    Alert.alert('그룹 삭제', '정말 그룹을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel', onPress: () => setMenuVisible(false) },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setMenuVisible(false);
          setDeleting(true);
          try {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) {
              router.replace('/(auth)/login');
              return;
            }

            const response = await fetch(getGroupUrl('DELETE', selectedGroup.id), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });

            const data = await response.json().catch(() => undefined);
            if (response.ok && data?.success) {
              await fetchGroups();
              Alert.alert('완료', '그룹이 삭제되었습니다.');
            } else {
              Alert.alert('오류', data?.message ?? '그룹 삭제 중 오류가 발생했습니다.');
            }
          } catch {
            Alert.alert('오류', '그룹 삭제 중 오류가 발생했습니다.');
          } finally {
            setDeleting(false);
            setSelectedGroup(null);
          }
        },
      },
    ]);
  };

  const isOwner = (group: StudyGroup) => group?.owner_id === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>스터디 그룹 목록</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
          <Text style={styles.createButtonText}>+ 그룹 만들기</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => (
            <SkeletonGroupCard key={i} />
          ))}
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>그룹 없음</Text>
          <Text style={styles.emptySubText}>새로 생성하기</Text>
          <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreateGroup}>
            <Text style={styles.emptyCreateButtonText}>그룹 만들기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupCardContent}
                onPress={() => handleGroupPress(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.groupCardInfo}>
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
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={e => handleGroupSettings(item, e)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol name='more-vert' size={20} color='#6B7280' />
              </TouchableOpacity>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 그룹 설정 메뉴 모달 */}
      <Modal
        transparent
        visible={menuVisible}
        animationType='fade'
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{selectedGroup?.name}</Text>
            {isOwner(selectedGroup!) ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditGroup}>
                  <Text style={styles.menuItemText}>그룹 편집</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteGroup}>
                  <Text style={[styles.menuItemText, styles.deleteText]}>그룹 삭제</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.menuSubtitle}>소유자만 편집/삭제할 수 있습니다.</Text>
            )}
          </View>
        </Pressable>
      </Modal>
      <BlockingLoader visible={deleting} message='그룹 삭제 중...' />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCardInfo: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 8,
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
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  emptyCreateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  emptyCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 280,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  menuItem: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  menuItemText: {
    fontSize: 14,
    color: '#111827',
  },
  deleteText: {
    color: '#DC2626',
  },
});
