import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getGroupUrl } from '@/config/api';
import { StudyGroup, GroupMemberStudyTime, GroupStudyTimeSummary } from '@/types/group';
import { useAuth } from '@/contexts/AuthContext';
import BlockingLoader from '@/components/BlockingLoader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SkeletonGroupCard } from '@/components/Skeleton';
import { apiFetch, AuthError } from '@/utils/apiClient';
import { colors, Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { connectSocket, disconnectSocket } from '@/utils/socketClient';
import { serverToClientEvents } from '@/constants/socket';
import type { Socket } from 'socket.io-client';

// 그룹 챗 탭 화면
const ExploreScreen = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  const [checkInInterval, setCheckInInterval] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [groupsStudyTime, setGroupsStudyTime] = useState<Map<string, GroupStudyTimeSummary>>(new Map());
  const [loadingStudyTime, setLoadingStudyTime] = useState(false);

  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

  // 그룹 멤버 공부시간 조회
  const fetchGroupMembersStudyTime = async (groupId: string): Promise<GroupMemberStudyTime[]> => {
    try {
      const data = await apiFetch<{ data?: { members?: GroupMemberStudyTime[] } }>(
        getGroupUrl('MEMBERS_STUDY_TIME', groupId),
        {
          method: 'GET',
          requireAuth: true,
        },
      );

      return data.data?.members || [];
    } catch (error: unknown) {
      console.error('Error fetching group members study time:', error);
      return [];
    }
  };

  // 모든 그룹의 공부시간 요약 조회
  const fetchAllGroupsStudyTime = async (
    groups: StudyGroup[],
  ): Promise<Map<string, GroupStudyTimeSummary>> => {
    const studyTimeMap = new Map<string, GroupStudyTimeSummary>();

    const promises = groups.map(async group => {
      try {
        const members = await fetchGroupMembersStudyTime(group.id);

        const totalMinutes = members.reduce((sum, member) => sum + member.totalMinutes, 0);

        const topMember =
          members.length > 0
            ? members.reduce((top, member) =>
                member.totalMinutes > top.totalMinutes ? member : top,
              )
            : undefined;

        studyTimeMap.set(group.id, {
          groupId: group.id,
          groupName: group.name,
          totalMinutes,
          memberCount: members.length,
          topMember,
        });
      } catch (error: unknown) {
        console.error(`Error fetching study time for group ${group.id}:`, error);
        studyTimeMap.set(group.id, {
          groupId: group.id,
          groupName: group.name,
          totalMinutes: 0,
          memberCount: 0,
        });
      }
    });

    await Promise.all(promises);
    return studyTimeMap;
  };

  // 그룹 목록 조회
  const fetchGroups = async () => {
    try {
      const data = await apiFetch<{ data?: { groups?: StudyGroup[] } }>(getGroupUrl('LIST'), {
        method: 'GET',
        requireAuth: true,
      });

      const fetchedGroups = data.data?.groups || [];
      setGroups(fetchedGroups);

      // 그룹 목록 조회 후 공부시간 조회
      if (fetchedGroups.length > 0) {
        setLoadingStudyTime(true);
        try {
          const studyTimeMap = await fetchAllGroupsStudyTime(fetchedGroups);
          setGroupsStudyTime(studyTimeMap);
        } catch (error: unknown) {
          console.error('Error fetching groups study time:', error);
        } finally {
          setLoadingStudyTime(false);
        }
      }
    } catch {
      // 그룹 목록 조회 실패 시 무시
    } finally {
      setLoading(false);
    }
  };

  // Socket 연결 및 이벤트 리스너 설정
  useEffect(() => {
    if (!user) return;

    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      try {
        socketInstance = await connectSocket();

        interface MembersTimeUpdateData {
          groupId: string;
          members: GroupMemberStudyTime[];
        }

        const handleMembersTimeUpdate = (data: MembersTimeUpdateData) => {
          setGroupsStudyTime(prev => {
            const next = new Map(prev);
            const current = next.get(data.groupId);

            if (current) {
              const totalMinutes = data.members.reduce((sum, member) => sum + member.totalMinutes, 0);

              const topMember =
                data.members.length > 0
                  ? data.members.reduce((top, member) =>
                      member.totalMinutes > top.totalMinutes ? member : top,
                    )
                  : undefined;

              next.set(data.groupId, {
                ...current,
                totalMinutes,
                memberCount: data.members.length,
                topMember,
              });
            }

            return next;
          });
        };

        socketInstance.on(serverToClientEvents.studyMembersTimeUpdate, handleMembersTimeUpdate);
      } catch (error: unknown) {
        console.error('Socket connection error:', error);
      }
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off(serverToClientEvents.studyMembersTimeUpdate);
        disconnectSocket();
      }
    };
  }, [user]);

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
    }, [user]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/chat/${groupId}`);
  };

  const handleGroupSettings = (group: StudyGroup, event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setSelectedGroup(group);
    setMenuVisible(true);
  };

  const handleEditGroup = async () => {
    if (!selectedGroup) return;
    setMenuVisible(false);
    
    // 그룹 상세 정보 조회
    try {
      const data = await apiFetch<{ data?: { group?: { chat_enabled: boolean; check_in_interval: number } } }>(
        getGroupUrl('DETAIL', selectedGroup.id),
        {
          method: 'GET',
          requireAuth: true,
        }
      );
      
      if (data.data?.group) {
        setChatEnabled(data.data.group.chat_enabled);
        setCheckInInterval(data.data.group.check_in_interval);
        setEditingSettings(true);
      }
    } catch {
      Alert.alert('오류', '그룹 정보를 불러올 수 없습니다.');
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedGroup || chatEnabled === null || checkInInterval === null) return;
    try {
      setSavingSettings(true);
      const data = await apiFetch<{
        success?: boolean;
        message?: string;
        data?: { group: StudyGroup };
      }>(getGroupUrl('SETTINGS', selectedGroup.id), {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify({
          chat_enabled: chatEnabled,
          check_in_interval: checkInInterval,
        }),
      });

      if (!data?.success) {
        Alert.alert('오류', data?.message ?? '그룹 설정 저장 중 오류가 발생했습니다.');
        return;
      }

      if (data.data?.group) {
        // 그룹 목록 업데이트
        setGroups(prev => prev.map(g => g.id === selectedGroup.id ? data.data!.group! : g));
      }
      
      setEditingSettings(false);
      Alert.alert('완료', '그룹 설정이 저장되었습니다.');
    } catch (e) {
      if (!(e instanceof AuthError)) {
        Alert.alert('오류', (e as Error).message ?? '그룹 설정 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setSavingSettings(false);
    }
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
            const data = await apiFetch<{ success?: boolean; message?: string }>(
              getGroupUrl('DELETE', selectedGroup.id),
              {
                method: 'DELETE',
                requireAuth: true,
              },
            );

            if (!data?.success) {
              Alert.alert('오류', data?.message ?? '그룹 삭제 중 오류가 발생했습니다.');
              return;
            }

            await fetchGroups();
            Alert.alert('완료', '그룹이 삭제되었습니다.');
          } catch (e) {
            if (!(e instanceof AuthError)) {
              Alert.alert('오류', (e as Error).message ?? '그룹 삭제 중 오류가 발생했습니다.');
            }
          } finally {
            setDeleting(false);
            setSelectedGroup(null);
          }
        },
      },
    ]);
  };

  const isOwner = (group: StudyGroup) => group?.owner_id === user?.id;

  // 공부시간 포맷팅
  const formatStudyTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  }, []);

  // 그룹 공부시간 요약 카드 Props
  interface GroupStudyTimeCardProps {
    group: StudyGroup;
    summary?: GroupStudyTimeSummary;
    onPress: () => void;
    isDark: boolean;
  }

  // 그룹 공부시간 요약 카드
  const GroupStudyTimeCard = React.memo<GroupStudyTimeCardProps>(({ group, summary, onPress, isDark }) => {
    const totalMinutes = summary?.totalMinutes || 0;
    const memberCount = summary?.memberCount || 0;

    return (
      <TouchableOpacity
        style={[
          styles.studyTimeCard,
          {
            backgroundColor: isDark ? colors.gray800 : colors.gray50,
            borderColor: isDark ? colors.gray700 : colors.gray200,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.studyTimeCardTitle, { color: isDark ? colors.white : colors.textPrimary }]}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <Text style={styles.studyTimeCardTime}>{formatStudyTime(totalMinutes)}</Text>
        <Text style={[styles.studyTimeCardMembers, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
          {memberCount}명
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? Colors.dark.background : colors.white,
            borderBottomColor: isDark ? colors.gray700 : colors.gray200,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
          그룹 챗
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
          <Text style={styles.createButtonText}>+ 그룹 만들기</Text>
        </TouchableOpacity>
      </View>

      {/* 그룹 공부시간 요약 섹션 */}
      {groups.length > 0 && (
        <View
          style={[
            styles.studyTimeSection,
            {
              backgroundColor: isDark ? Colors.dark.background : colors.white,
              borderBottomColor: isDark ? colors.gray700 : colors.gray200,
            },
          ]}
        >
          <Text style={[styles.studyTimeSectionTitle, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
            오늘의 공부시간
          </Text>
          {loadingStudyTime ? (
            <ActivityIndicator size='small' color={colors.blue500} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.studyTimeScrollContent}
            >
              {groups.map(group => {
                const summary = groupsStudyTime.get(group.id);
                return (
                  <GroupStudyTimeCard
                    key={group.id}
                    group={group}
                    summary={summary}
                    onPress={() => handleGroupPress(group.id)}
                    isDark={isDark}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => (
            <SkeletonGroupCard key={i} />
          ))}
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
                그룹 없음
              </Text>
              <Text style={[styles.emptySubText, { color: isDark ? colors.gray400 : colors.textTertiary }]}>
                새로 생성하기
              </Text>
          <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreateGroup}>
            <Text style={styles.emptyCreateButtonText}>그룹 만들기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.groupCard,
                { backgroundColor: isDark ? colors.gray800 : colors.white },
              ]}
            >
              <TouchableOpacity
                style={styles.groupCardContent}
                onPress={() => handleGroupPress(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.groupCardInfo}>
                  <Text style={[styles.groupName, { color: isDark ? colors.white : colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      style={[styles.groupDescription, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.groupDate, { color: isDark ? colors.gray400 : colors.textTertiary }]}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={e => handleGroupSettings(item, e)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  name='more-vert'
                  size={20}
                  color={isDark ? colors.gray300 : colors.textSecondary}
                />
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
          <View
            style={[styles.menuContainer, { backgroundColor: isDark ? colors.gray800 : colors.white }]}
          >
            <Text style={[styles.menuTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
              {selectedGroup?.name}
            </Text>
            {isOwner(selectedGroup!) ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditGroup}>
                  <Text style={[styles.menuItemText, { color: isDark ? colors.white : colors.textPrimary }]}>
                    그룹 편집
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteGroup}>
                  <Text style={[styles.menuItemText, styles.deleteText]}>그룹 삭제</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[styles.menuSubtitle, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
                소유자만 편집/삭제할 수 있습니다.
              </Text>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* 그룹 설정 편집 모달 */}
      <Modal
        transparent
        visible={editingSettings}
        animationType='slide'
        onRequestClose={() => {
          setEditingSettings(false);
          setChatEnabled(null);
          setCheckInInterval(null);
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            setEditingSettings(false);
            setChatEnabled(null);
            setCheckInInterval(null);
          }}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View
              style={[
                styles.settingsModalContainer,
                { backgroundColor: isDark ? colors.gray800 : colors.white },
              ]}
            >
              <Text style={[styles.settingsModalTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
                그룹 설정
              </Text>
              <Text style={[styles.settingsModalSubtitle, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
                {selectedGroup?.name}
              </Text>

              <View style={styles.settingsSection}>
                <View
                  style={[
                    styles.settingRow,
                    { borderBottomColor: isDark ? colors.gray700 : colors.gray200 },
                  ]}
                >
                  <Text style={[styles.settingLabel, { color: isDark ? colors.white : colors.textPrimary }]}>
                    채팅 허용
                  </Text>
                  <Switch
                    value={chatEnabled ?? false}
                    onValueChange={setChatEnabled}
                    trackColor={{ false: isDark ? colors.gray700 : '#D1D5DB', true: colors.blue500 }}
                    thumbColor='#FFFFFF'
                  />
                </View>

                <View
                  style={[
                    styles.settingRow,
                    { borderBottomColor: isDark ? colors.gray700 : colors.gray200 },
                  ]}
                >
                  <Text style={[styles.settingLabel, { color: isDark ? colors.white : colors.textPrimary }]}>
                    체크인 간격 (분)
                  </Text>
                  <TextInput
                    style={[
                      styles.intervalInput,
                      {
                        backgroundColor: isDark ? colors.gray900 : colors.white,
                        borderColor: isDark ? colors.gray700 : '#D1D5DB',
                        color: isDark ? colors.white : colors.textPrimary,
                      },
                    ]}
                    value={checkInInterval?.toString() ?? ''}
                    onChangeText={text => {
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num > 0) {
                        setCheckInInterval(num);
                      } else if (text === '') {
                        setCheckInInterval(null);
                      }
                    }}
                    keyboardType='number-pad'
                    placeholder='30'
                    placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.settingsModalActions}>
                <TouchableOpacity
                  style={[
                    styles.settingsModalButton,
                    styles.cancelButton,
                    { backgroundColor: isDark ? colors.gray700 : '#F3F4F6' },
                  ]}
                  onPress={() => {
                    setEditingSettings(false);
                    setChatEnabled(null);
                    setCheckInInterval(null);
                  }}
                >
                  <Text
                    style={[styles.cancelButtonText, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                  >
                    취소
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsModalButton, styles.saveButton]}
                  onPress={handleSaveSettings}
                  disabled={savingSettings || chatEnabled === null || checkInInterval === null}
                >
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <BlockingLoader visible={deleting || savingSettings} message={deleting ? '그룹 삭제 중...' : '설정 저장 중...'} />
    </View>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  groupDate: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
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
    marginBottom: 8,
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 8,
  },
  menuItem: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 14,
  },
  deleteText: {
    color: '#DC2626',
  },
  settingsModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingsModalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  intervalInput: {
    width: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  settingsModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  settingsModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // backgroundColor는 동적으로 설정
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563EB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  studyTimeSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  studyTimeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  studyTimeScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  studyTimeCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  studyTimeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  studyTimeCardTime: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.blue500,
    marginBottom: 4,
  },
  studyTimeCardMembers: {
    fontSize: 12,
  },
});
