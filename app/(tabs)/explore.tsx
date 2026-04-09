import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import AppModal from '@/components/AppModal';
import { connectSocket, disconnectSocket } from '@/utils/socketClient';
import { serverToClientEvents } from '@/constants/socket';
import type { Socket } from 'socket.io-client';

// 그룹 챗 탭 화면
const ExploreScreen = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);
  const router = useRouter();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  const [checkInInterval, setCheckInInterval] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedModalVisible, setSettingsSavedModalVisible] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant?: 'primary' | 'danger';
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'primary',
  });
  const [leaving, setLeaving] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudyGroup | null>(null);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<StudyGroup | null>(null);
  const [groupsStudyTime, setGroupsStudyTime] = useState<Map<string, GroupStudyTimeSummary>>(new Map());
  const [loadingStudyTime, setLoadingStudyTime] = useState(false);

  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

  const showError = (message: string, title = '오류') => {
    setAlertModal({
      visible: true,
      title,
      message,
      variant: 'danger',
    });
  };

  const showInfo = (title: string, message: string) => {
    setAlertModal({
      visible: true,
      title,
      message,
      variant: 'primary',
    });
  };

  const closeAlertModal = () =>
    setAlertModal(prev => ({
      ...prev,
      visible: false,
    }));

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

  const handleEditGroup = async (group: StudyGroup) => {
    try {
      const data = await apiFetch<{ data?: { group?: StudyGroup } }>(getGroupUrl('DETAIL', group.id), {
        method: 'GET',
        requireAuth: true,
      });

      const fullGroup = data.data?.group;
      if (fullGroup) {
        setSelectedGroup(fullGroup);
        setChatEnabled(fullGroup.chat_enabled);
        setCheckInInterval(fullGroup.check_in_interval);
        setEditGroupName(fullGroup.name);
        setEditGroupDescription(fullGroup.description ?? '');
        setEditingSettings(true);
      }
    } catch {
      showError('그룹 정보를 불러올 수 없습니다.');
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedGroup || chatEnabled === null || checkInInterval === null) return;

    const trimmedName = editGroupName.trim();
    if (!trimmedName) {
      showError('그룹명을 입력해주세요.');
      return;
    }

    try {
      setSavingSettings(true);
      // 1) 그룹 기본 정보 업데이트 (이름, 설명)
      const updateInfo = await apiFetch<{
        success?: boolean;
        message?: string;
        data?: { group: StudyGroup };
      }>(getGroupUrl('UPDATE', selectedGroup.id), {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify({
          name: trimmedName,
          description: editGroupDescription.trim() || undefined,
        }),
      });

      if (!updateInfo?.success) {
        showError(updateInfo?.message ?? '그룹 정보 저장 중 오류가 발생했습니다.');
        return;
      }

      // 2) 그룹 설정 업데이트 (채팅 허용, 체크인 간격)
      const settingsResult = await apiFetch<{
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

      if (!settingsResult?.success) {
        showError(settingsResult?.message ?? '그룹 설정 저장 중 오류가 발생했습니다.');
        return;
      }

      const updatedGroup = settingsResult.data?.group ?? updateInfo.data?.group;
      if (updatedGroup && selectedGroup) {
        setGroups(prev => prev.map(g => (g.id === selectedGroup.id ? updatedGroup : g)));
      }
      setEditingSettings(false);
      setChatEnabled(null);
      setCheckInInterval(null);
      setSelectedGroup(null);
      setEditGroupName('');
      setEditGroupDescription('');
      setSettingsSavedModalVisible(true);
    } catch (e) {
      if (!(e instanceof AuthError)) {
        showError((e as Error).message ?? '그룹 설정 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteGroup = (group: StudyGroup) => {
    setDeleteTarget(group);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const data = await apiFetch<{ success?: boolean; message?: string }>(
        getGroupUrl('DELETE', deleteTarget.id),
        { method: 'DELETE', requireAuth: true },
      );
      if (!data?.success) {
        showError(data?.message ?? '그룹 삭제 중 오류가 발생했습니다.');
        return;
      }
      await fetchGroups();
    } catch (e) {
      if (!(e instanceof AuthError)) {
        showError((e as Error).message ?? '그룹 삭제 중 오류가 발생했습니다.');
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmVisible(false);
      setDeleteTarget(null);
      setSelectedGroup(null);
    }
  };

  const handleLeaveGroup = (group: StudyGroup) => {
    setLeaveTarget(group);
    setLeaveConfirmVisible(true);
  };

  const confirmLeaveGroup = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    try {
      const data = await apiFetch<{ success?: boolean; message?: string }>(
        getGroupUrl('LEAVE', leaveTarget.id),
        { method: 'DELETE', requireAuth: true },
      );
      if (!data?.success) {
        showError(data?.message ?? '그룹 탈퇴 중 오류가 발생했습니다.');
        return;
      }
      await fetchGroups();
      setSelectedGroup(null);
      showInfo('완료', '그룹에서 나갔습니다.');
    } catch (e) {
      if (!(e instanceof AuthError)) {
        showError((e as Error).message ?? '그룹 탈퇴 중 오류가 발생했습니다.');
      }
    } finally {
      setLeaving(false);
      setLeaveConfirmVisible(false);
      setLeaveTarget(null);
    }
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
    themeColors: ReturnType<typeof getThemeColors>;
  }

  // 그룹 공부시간 요약 카드
  const GroupStudyTimeCard = React.memo<GroupStudyTimeCardProps>(({ group, summary, onPress, themeColors }) => {
    const totalMinutes = summary?.totalMinutes || 0;
    const memberCount = summary?.memberCount || 0;

    return (
      <TouchableOpacity
        style={[
          styles.studyTimeCard,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: themeColors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.studyTimeCardTitle, { color: themeColors.textPrimary }]}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <Text style={styles.studyTimeCardTime}>{formatStudyTime(totalMinutes)}</Text>
        <Text style={[styles.studyTimeCardMembers, { color: themeColors.textSecondary }]}>
          {memberCount}명
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.cardBackground,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
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
              backgroundColor: themeColors.cardBackground,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.studyTimeSectionTitle, { color: themeColors.textSecondary }]}>
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
                    themeColors={themeColors}
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
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                그룹 없음
              </Text>
              <Text style={[styles.emptySubText, { color: themeColors.textTertiary }]}>
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
                { backgroundColor: themeColors.cardBackground },
              ]}
            >
              <TouchableOpacity
                style={styles.groupCardContent}
                onPress={() => handleGroupPress(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.groupCardInfo}>
                  <Text style={[styles.groupName, { color: themeColors.textPrimary }]}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      style={[styles.groupDescription, { color: themeColors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.groupDate, { color: themeColors.textTertiary }]}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                {isOwner(item) && (
                  <TouchableOpacity
                    style={styles.smallActionButton}
                    onPress={() => handleEditGroup(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      name='edit'
                      size={18}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.smallActionButton}
                  onPress={() => (isOwner(item) ? handleDeleteGroup(item) : handleLeaveGroup(item))}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol
                    name={isOwner(item) ? 'delete' : 'logout'}
                    size={18}
                    color={colors.red500}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 그룹 설정 편집 모달 (표준 AppModal) */}
      <AppModal
        visible={editingSettings}
        onRequestClose={() => {
          setEditingSettings(false);
          setSelectedGroup(null);
          setEditGroupName('');
          setEditGroupDescription('');
          setChatEnabled(null);
          setCheckInInterval(null);
        }}
        title='그룹 설정'
        subtitle={selectedGroup?.name}
        animationType='fade'
        type='confirmCancel'
        confirmText='저장'
        cancelText='취소'
        onConfirm={handleSaveSettings}
        onCancel={() => {
          setEditingSettings(false);
          setSelectedGroup(null);
          setEditGroupName('');
          setEditGroupDescription('');
          setChatEnabled(null);
          setCheckInInterval(null);
        }}
        confirmDisabled={
          savingSettings ||
          chatEnabled === null ||
          checkInInterval === null ||
          !editGroupName.trim()
        }
        content={
          <View style={styles.settingsSection}>
            {/* 그룹 기본 정보 */}
            <View style={[styles.settingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
                그룹명
              </Text>
            </View>
            <TextInput
              style={[
                styles.groupNameInput,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              value={editGroupName}
              onChangeText={setEditGroupName}
              placeholder='그룹명을 입력하세요'
              placeholderTextColor={themeColors.textTertiary}
              maxLength={100}
            />

            <View style={[styles.settingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
                설명
              </Text>
            </View>
            <TextInput
              style={[
                styles.groupDescriptionInput,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              value={editGroupDescription}
              onChangeText={setEditGroupDescription}
              placeholder='그룹 설명을 입력하세요 (선택)'
              placeholderTextColor={themeColors.textTertiary}
              multiline
              maxLength={500}
            />

            {/* 그룹 설정 */}
            <View style={[styles.settingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
                채팅 허용
              </Text>
              <Switch
                value={chatEnabled ?? false}
                onValueChange={setChatEnabled}
                trackColor={{ false: themeColors.borderSecondary, true: colors.blue500 }}
                thumbColor='#FFFFFF'
              />
            </View>
            <View style={[styles.settingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
                체크인 간격 (분)
              </Text>
              <TextInput
                style={[
                  styles.intervalInput,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                value={checkInInterval?.toString() ?? ''}
                onChangeText={text => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num > 0) setCheckInInterval(num);
                  else if (text === '') setCheckInInterval(null);
                }}
                keyboardType='number-pad'
                placeholder='30'
                placeholderTextColor={themeColors.textTertiary}
              />
            </View>
          </View>
        }
      />

      {/* 그룹 설정 저장 완료 모달 */}
      <AppModal
        visible={settingsSavedModalVisible}
        onRequestClose={() => setSettingsSavedModalVisible(false)}
        title='저장되었습니다.'
        subtitle='그룹 설정이 저장되었습니다.'
        animationType='fade'
        type='confirm'
        confirmText='확인'
        onConfirm={() => setSettingsSavedModalVisible(false)}
      />

      {/* 그룹 삭제 확인 모달 (중앙 알림 모달 규격) */}
      <AppModal
        visible={deleteConfirmVisible}
        onRequestClose={() => {
          if (deleting) return;
          setDeleteConfirmVisible(false);
          setDeleteTarget(null);
        }}
        title={deleteTarget ? `\"${deleteTarget.name}\" 그룹 삭제` : '그룹 삭제'}
        animationType='fade'
        type='confirmCancel'
        confirmText='삭제'
        cancelText='취소'
        confirmVariant='danger'
        onConfirm={confirmDeleteGroup}
        onCancel={() => {
          if (deleting) return;
          setDeleteConfirmVisible(false);
          setDeleteTarget(null);
        }}
        confirmDisabled={deleting}
        content={
          <Text
            style={{
              fontSize: 14,
              color: themeColors.textSecondary,
              textAlign: 'center',
            }}
          >
            정말 이 그룹을 삭제하시겠습니까?{'\n'}이 작업은 되돌릴 수 없습니다.
          </Text>
        }
      />

      <BlockingLoader
        visible={deleting || savingSettings || leaving}
        message={deleting ? '그룹 삭제 중...' : leaving ? '그룹 탈퇴 중...' : '설정 저장 중...'}
      />

      {/* 그룹 탈퇴 확인 모달 */}
      <AppModal
        visible={leaveConfirmVisible}
        onRequestClose={() => {
          if (leaving) return;
          setLeaveConfirmVisible(false);
          setLeaveTarget(null);
        }}
        title='그룹 탈퇴'
        subtitle={leaveTarget ? `"${leaveTarget.name}" 그룹에서 나가시겠습니까?` : '그룹에서 나가시겠습니까?'}
        animationType='fade'
        type='confirmCancel'
        confirmText='나가기'
        cancelText='취소'
        confirmVariant='danger'
        onConfirm={confirmLeaveGroup}
        onCancel={() => {
          if (leaving) return;
          setLeaveConfirmVisible(false);
          setLeaveTarget(null);
        }}
        confirmDisabled={leaving}
      />

      {/* 공통 오류/알림 모달 */}
      <AppModal
        visible={alertModal.visible}
        onRequestClose={closeAlertModal}
        title={alertModal.title}
        subtitle={alertModal.message}
        animationType='fade'
        type='confirm'
        confirmText='확인'
        confirmVariant={alertModal.variant === 'danger' ? 'danger' : 'primary'}
        onConfirm={closeAlertModal}
      />
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCardInfo: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  smallActionButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallActionDanger: {
    color: '#DC2626',
  },
  settingsSection: {
    marginBottom: 24,
  },
  groupNameInput: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  groupDescriptionInput: {
    width: '100%',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
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
