import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/contexts/AuthContext';
import { getAuthUrl, getGroupUrl } from '@/config/api';
import BlockingLoader from '@/components/BlockingLoader';
import { StudyGroup } from '@/types/group';

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const nickname =
    // TODO: 서버 프로필 닉네임 연동 시 user.nickname으로 교체
    (user?.email && user.email.split('@')[0]) || '게스트';

  const avatar = nickname.charAt(0).toUpperCase();

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
      // 그룹 목록 조회 실패 시 무시 (사용자 경험 저해 방지)
    }
  };

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = () => {
    router.push('/(tabs)/groups/create');
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/(tabs)/groups/${groupId}`);
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const handleEditNickname = () => {
    // TODO: 닉네임 수정 화면/모달 연동
    setMenuVisible(false);
  };

  const handleEditIcon = () => {
    // TODO: 아이콘 수정 UI 연동
    setMenuVisible(false);
  };

  const handleWithdraw = () => {
    Alert.alert('회원탈퇴', '정말 회원탈퇴 하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '회원탈퇴',
        style: 'destructive',
        onPress: async () => {
          setMenuVisible(false);
          try {
            setWithdrawing(true);
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
              await logout();
              router.replace('/(auth)/login');
              return;
            }

            const response = await fetch(getAuthUrl('WITHDRAW'), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            const data = await response.json().catch(() => undefined);
            if (!response.ok || !data?.success) {
              Alert.alert('오류', data?.message ?? '회원탈퇴 중 오류가 발생했습니다.');
              return;
            }

            Alert.alert('완료', '회원탈퇴가 완료되었습니다.');
            await logout();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('오류', '회원탈퇴 중 오류가 발생했습니다.');
          } finally {
            setWithdrawing(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 헤더 영역 (약 30px 높이) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PostPolio</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setMenuVisible(true)}
          accessibilityRole='button'
          accessibilityLabel='프로필 메뉴 열기'
        >
          <Text style={styles.profileAvatar}>{avatar}</Text>
        </TouchableOpacity>
      </View>

      {/* 홈 본문 - 그룹 목록 */}
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>내 스터디 그룹</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
            <Text style={styles.createButtonText}>+ 그룹 만들기</Text>
          </TouchableOpacity>
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 그룹이 없습니다.</Text>
            <Text style={styles.emptySubText}>그룹을 만들어 스터디를 시작해보세요!</Text>
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
      </View>

      {/* 프로필 메뉴 모달 */}
      <Modal
        transparent
        visible={menuVisible}
        animationType='fade'
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>프로필</Text>
            <Text style={styles.menuSubtitle}>{nickname}</Text>

            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} onPress={handleEditNickname}>
                <Text style={styles.menuItemText}>닉네임 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleEditIcon}>
                <Text style={styles.menuItemText}>아이콘 수정</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Text style={styles.menuItemText}>로그아웃</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.withdrawWrapper} onPress={handleWithdraw}>
              <Text style={styles.withdrawText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      {/* 회원탈퇴 등 API 요청 시 전체 화면 로딩 오버레이 */}
      <BlockingLoader visible={withdrawing} message='회원탈퇴 중입니다...' />
    </SafeAreaView>
  );
};

export default HomeScreen;

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
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    color: '#F9FAFB',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
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
    paddingBottom: 16,
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
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 56,
    marginRight: 16,
    width: 220,
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
  },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  menuSection: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: '#111827',
  },
  withdrawWrapper: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  withdrawText: {
    fontSize: 13,
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
});
