import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/contexts/AuthContext';
import { getAuthUrl, getGroupUrl, getApiUrl } from '@/config/api';
import BlockingLoader from '@/components/BlockingLoader';
import { StudyGroup } from '@/types/group';
import { ExamWithGrades } from '@/types/grade';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Skeleton, SkeletonChip } from '@/components/Skeleton';
import { apiFetch, AuthError } from '@/utils/apiClient';
import { colors, Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AppModal from '@/components/AppModal';

const FAVORITES_STORAGE_KEY = 'group_favorites';

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [upcomingExam, setUpcomingExam] = useState<ExamWithGrades | null>(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);
  const [loadingTodayStudy, setLoadingTodayStudy] = useState(false);
  const [withdrawConfirmVisible, setWithdrawConfirmVisible] = useState(false);
  const [withdrawResultModal, setWithdrawResultModal] = useState<{
    visible: boolean;
    isError?: boolean;
    message: string;
  }>({
    visible: false,
    message: '',
  });

  const baseNickname = user?.nickname || (user?.email && user.email.split('@')[0]) || '게스트';
  const nickname = baseNickname.length > 8 ? baseNickname.slice(0, 8) : baseNickname;

  const avatar = nickname.charAt(0).toUpperCase();

  // 즐겨찾기 로드
  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setFavorites(new Set(parsed));
      }
    } catch {
      // 즐겨찾기 로드 실패 시 무시
    }
  };

  // 즐겨찾기 저장
  const saveFavorites = async (newFavorites: Set<string>) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavorites)));
      setFavorites(newFavorites);
    } catch {
      // 즐겨찾기 저장 실패 시 무시
    }
  };

  // 그룹 목록 조회
  const fetchGroups = async () => {
    try {
      const data = await apiFetch<{ data?: { groups?: StudyGroup[] } }>(getGroupUrl('LIST'), {
        method: 'GET',
        requireAuth: true,
      });
      setGroups(data.data?.groups || []);
    } catch {
      // 그룹 목록 조회 실패 시 무시 (사용자 경험 저해 방지)
    } finally {
      setLoading(false);
    }
  };

  // 다가오는 시험 조회: 서버에서 제공하는 목록 중 가장 가까운 시험 하나 선택
  const fetchUpcomingExam = async () => {
    try {
      setLoadingGrades(true);
      const data = await apiFetch<{ data?: { exams?: ExamWithGrades[] } }>(
        getApiUrl('/api/grades/upcoming'),
        {
          method: 'GET',
          requireAuth: true,
        }
      );
      const exams = data.data?.exams || [];

      if (exams.length === 0) {
        setUpcomingExam(null);
        return;
      }

      const upcoming = [...exams].sort(
        (a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      )[0];

      setUpcomingExam(upcoming);
    } catch {
      // 시험 조회 실패 시 무시
      setUpcomingExam(null);
    } finally {
      setLoadingGrades(false);
    }
  };

  // 오늘 공부 시간 조회
  const fetchTodayStudyMinutes = async () => {
    try {
      setLoadingTodayStudy(true);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const data = await apiFetch<{ data?: Array<{ totalMinutes?: number }> }>(
        getApiUrl(`/api/stats/daily?startDate=${dateStr}&endDate=${dateStr}`),
        {
          method: 'GET',
          requireAuth: true,
        }
      );

      const total = (data.data || []).reduce((sum, item) => sum + (item.totalMinutes ?? 0), 0);
      setTodayStudyMinutes(total);
    } catch {
      setTodayStudyMinutes(0);
    } finally {
      setLoadingTodayStudy(false);
    }
  };

  // D-day 계산
  const calculateDDay = (examDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 다가오는 시험 목표/현재 점수 합계 및 달성률
  const upcomingTotals = useMemo(() => {
    if (!upcomingExam || !upcomingExam.grades || upcomingExam.grades.length === 0) {
      return null;
    }

    const totalTarget = upcomingExam.grades.reduce(
      (sum, grade) => sum + (grade.target_score ?? 0),
      0
    );
    const totalCurrent = upcomingExam.grades.reduce(
      (sum, grade) => sum + (grade.current_score ?? 0),
      0
    );

    const progress =
      totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;

    return {
      totalTarget,
      totalCurrent,
      progress,
    };
  }, [upcomingExam]);

  // 초기 로드
  useEffect(() => {
    if (user) {
      setLoading(true);
      loadFavorites();
      fetchGroups();
      fetchUpcomingExam();
      fetchTodayStudyMinutes();
    } else {
      setLoading(false);
    }
  }, [user]);

  // 화면 포커스 시 데이터 갱신 (그룹 생성/삭제/나가기 후 돌아올 때)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchGroups();
        fetchUpcomingExam();
        fetchTodayStudyMinutes();
      }
    }, [user])
  );

  // 즐겨찾기 토글
  const handleToggleFavorite = async (groupId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(groupId)) {
      newFavorites.delete(groupId);
    } else {
      newFavorites.add(groupId);
    }
    await saveFavorites(newFavorites);
  };

  // 정렬된 그룹 목록 (즐겨찾기 우선, 그 다음 오래된 순서, 최대 5개)
  const displayedGroups = useMemo(() => {
    const sorted = [...groups].sort((a, b) => {
      const aIsFavorite = favorites.has(a.id);
      const bIsFavorite = favorites.has(b.id);

      // 즐겨찾기 우선
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // 같은 즐겨찾기 상태면 오래된 순서
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return sorted.slice(0, 5);
  }, [groups, favorites]);

  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/chat/${groupId}`);
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  const handleEditProfile = () => {
    setMenuVisible(false);
    router.push('/profile/edit');
  };

  const handleWithdraw = () => {
    setWithdrawConfirmVisible(true);
  };

  const handleConfirmWithdraw = async () => {
    setWithdrawConfirmVisible(false);
    setMenuVisible(false);
    try {
      setWithdrawing(true);
      const data = await apiFetch<{ success?: boolean; message?: string }>(getAuthUrl('WITHDRAW'), {
        method: 'DELETE',
        requireAuth: true,
      });

      if (!data?.success) {
        setWithdrawResultModal({
          visible: true,
          isError: true,
          message: data?.message ?? '회원탈퇴 중 오류가 발생했습니다.',
        });
        return;
      }

      setWithdrawResultModal({
        visible: true,
        isError: false,
        message: '회원탈퇴가 완료되었습니다.',
      });
      await logout();
      router.replace('/(auth)/login');
    } catch (e) {
      if (!(e instanceof AuthError)) {
        setWithdrawResultModal({
          visible: true,
          isError: true,
          message: '회원탈퇴 중 오류가 발생했습니다.',
        });
      }
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : colors.white }]}
    >
      {/* 상단 헤더 영역 */}
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
          딥웰스터디
        </Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setMenuVisible(true)}
          accessibilityRole='button'
          accessibilityLabel='프로필 메뉴 열기'
        >
          <Text style={styles.profileAvatar}>{avatar}</Text>
        </TouchableOpacity>
      </View>

      {/* 홈 본문 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 다가오는 시험 섹션 */}
        <View style={styles.gradesSection}>
        <View style={styles.headerSection}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
              다가오는 시험
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/grades')}>
              <Text style={styles.moreLink}>더 보기</Text>
            </TouchableOpacity>
          </View>
          {loadingGrades ? (
            <View
              style={[
                styles.chartContainer,
                {
                  backgroundColor: isDark ? colors.gray800 : colors.white,
                  borderColor: isDark ? colors.gray700 : colors.gray200,
                },
              ]}
            >
              {/* 시험 이름 + D-day 스켈레톤 */}
              <View style={styles.examHeader}>
                <Skeleton width='60%' height={20} />
                <Skeleton width={72} height={28} borderRadius={14} />
              </View>

              {/* 목표/현재/달성률 스켈레톤 */}
              <View style={styles.examSummaryContainer}>
                <View style={styles.examSummaryRow}>
                  <View>
                    <Skeleton width={60} height={12} />
                    <Skeleton width={80} height={16} style={{ marginTop: 6 }} />
                  </View>
                  <View>
                    <Skeleton width={80} height={12} />
                    <Skeleton width={90} height={16} style={{ marginTop: 6 }} />
                  </View>
                  <View>
                    <Skeleton width={50} height={12} />
                    <Skeleton width={40} height={16} style={{ marginTop: 6 }} />
                  </View>
                </View>

                {/* 진행바 스켈레톤 */}
                <View style={[styles.progressBar, { marginTop: 4 }]}>
                  <Skeleton width='70%' height={8} borderRadius={999} />
                </View>

                {/* 버튼 스켈레톤 */}
                <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <Skeleton width={160} height={24} borderRadius={999} />
                </View>
              </View>
            </View>
          ) : upcomingExam ? (
            <TouchableOpacity
              style={[
                styles.chartContainer,
                {
                  backgroundColor: isDark ? colors.gray800 : colors.white,
                  borderColor: isDark ? colors.gray700 : colors.gray200,
                },
              ]}
              activeOpacity={0.9}
              onPress={() => router.push(`/grades/${upcomingExam.id}/subjects`)}
            >
              <View style={styles.examHeader}>
                <Text style={[styles.examName, { color: isDark ? colors.white : colors.textPrimary }]}>
                  {upcomingExam.exam_name}
                </Text>
                <View style={styles.dDayBadge}>
                  <Text style={styles.dDayText}>D-{calculateDDay(upcomingExam.exam_date)}</Text>
                </View>
              </View>

              {upcomingTotals ? (
                <View style={styles.examSummaryContainer}>
                  <View style={styles.examSummaryRow}>
                    <View>
                      <Text
                        style={[styles.examSummaryLabel, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                      >
                        목표 총점
                      </Text>
                      <Text style={[styles.examSummaryValue, { color: isDark ? colors.white : colors.textPrimary }]}>
                        {upcomingTotals.totalTarget.toLocaleString()}점
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[styles.examSummaryLabel, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                      >
                        현재 예상 점수
                      </Text>
                      <Text style={[styles.examSummaryValue, { color: isDark ? colors.white : colors.textPrimary }]}>
                        {upcomingTotals.totalCurrent.toLocaleString()}점
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[styles.examSummaryLabel, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                      >
                        달성률
                      </Text>
                      <Text style={styles.examSummaryPercent}>{upcomingTotals.progress}%</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: isDark ? colors.gray700 : colors.gray200 },
                    ]}
                  >
                    <View
                      style={[styles.progressBarFill, { width: `${upcomingTotals.progress}%` }]}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.noGradesContainer}>
                  <Text
                    style={[styles.noGradesText, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                  >
                    과목별 목표 점수를 먼저 설정해 주세요.
                  </Text>
                  <TouchableOpacity
                    style={styles.addSubjectButton}
                    onPress={() => router.push(`/grades/${upcomingExam.id}/subjects`)}
                  >
                    <Text style={styles.addSubjectButtonText}>과목 추가</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.chartContainer,
                {
                  backgroundColor: isDark ? colors.gray800 : colors.white,
                  borderColor: isDark ? colors.gray700 : colors.gray200,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.createExamButton}
                onPress={() => router.push('/grades/create')}
              >
                <Text style={styles.createExamButtonText}>새 시험 생성하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 오늘 총 공부 시간 */}
        <View
          style={[
            styles.todayStudyCard,
            {
              backgroundColor: isDark ? colors.gray800 : colors.white,
              borderColor: isDark ? colors.gray700 : colors.gray200,
            },
          ]}
        >
          <View style={styles.todayStudyHeader}>
            <Text style={[styles.todayStudyTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
              오늘 총 공부 시간
            </Text>
            <IconSymbol name='timer' size={18} color={colors.blue500} />
          </View>
          <Text style={styles.todayStudyValue}>
            {loadingTodayStudy ? '...' : formatMinutes(todayStudyMinutes)}
          </Text>
        </View>

        {/* 그룹 목록 섹션 */}
        <View style={styles.groupsSection}>
          <View style={styles.headerSection}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
              내 스터디 그룹
            </Text>
        </View>

        {loading ? (
          <View style={styles.groupsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupsScrollContent}
            >
              {[1, 2, 3, 4, 5].map(i => (
                <SkeletonChip key={i} />
              ))}
            </ScrollView>
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
          <View style={styles.groupsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupsScrollContent}
            >
              {displayedGroups.map(item => {
                const isFavorite = favorites.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                      style={[
                        styles.groupChip,
                        { backgroundColor: isDark ? colors.gray800 : colors.white },
                      ]}
                    onPress={() => handleGroupPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <Pressable
                      style={styles.favoriteButton}
                      onPress={() => handleToggleFavorite(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <IconSymbol
                          name='star'
                        style={{
                          borderRadius: 14,
                          shadowColor: 'rgba(255, 214, 0, 1)',
                          shadowOffset: { width: 1, height: 1 },
                          shadowOpacity: 1,
                          shadowRadius: 1,
                          elevation: 2,
                        }}
                        size={isFavorite ? 17 : 16}
                        color={isFavorite ? 'rgba(255, 214, 0, 1)' : 'rgba(255, 214, 0, 0.3)'}
                      />
                    </Pressable>
                    <View style={styles.chipContent}>
                        <Text
                          style={[styles.chipName, { color: isDark ? colors.white : colors.textPrimary }]}
                          numberOfLines={1}
                        >
                        {item.name}
                      </Text>
                      {item.description ? (
                          <Text
                            style={[styles.chipDescription, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                            numberOfLines={2}
                          >
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
      </ScrollView>

      {/* 회원탈퇴 확인 모달 */}
      <AppModal
        visible={withdrawConfirmVisible}
        onRequestClose={() => setWithdrawConfirmVisible(false)}
        title='회원탈퇴'
        subtitle='정말 회원탈퇴 하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        animationType='fade'
        type='confirmCancel'
        confirmText='회원탈퇴'
        cancelText='취소'
        confirmVariant='danger'
        onConfirm={handleConfirmWithdraw}
        onCancel={() => setWithdrawConfirmVisible(false)}
      />

      {/* 회원탈퇴 결과 모달 */}
      <AppModal
        visible={withdrawResultModal.visible}
        onRequestClose={() =>
          setWithdrawResultModal(prev => ({
            ...prev,
            visible: false,
          }))
        }
        title={withdrawResultModal.isError ? '오류' : '완료'}
        subtitle={withdrawResultModal.message}
        animationType='fade'
        type='confirm'
        confirmText='확인'
        confirmVariant={withdrawResultModal.isError ? 'danger' : 'primary'}
        onConfirm={() =>
          setWithdrawResultModal(prev => ({
            ...prev,
            visible: false,
          }))
        }
      />

      {/* 프로필 메뉴 모달 */}
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
              프로필
            </Text>
            <Text style={[styles.menuSubtitle, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
              {nickname}
            </Text>

            <View
              style={[
                styles.menuSection,
                { borderTopColor: isDark ? colors.gray700 : colors.gray200 },
              ]}
            >
              <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                <Text style={[styles.menuItemText, { color: isDark ? colors.white : colors.textPrimary }]}>
                  내 정보 변경
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.menuSection,
                { borderTopColor: isDark ? colors.gray700 : colors.gray200 },
              ]}
            >
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Text style={[styles.menuItemText, { color: isDark ? colors.white : colors.textPrimary }]}>
                  로그아웃
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.withdrawWrapper} onPress={handleWithdraw}>
              <Text style={styles.withdrawText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      {/* 회원탈퇴 등 API 요청 시 전체 화면 로딩 오버레이 */}
      <BlockingLoader visible={withdrawing} message='처리 중입니다...' />
    </View>
  );
};

export default HomeScreen;

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
  gradesSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  moreLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  examName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  dDayBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  dDayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  examSummaryContainer: {
    marginTop: 4,
  },
  examSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  examSummaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  examSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  examSummaryPercent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  noGradesContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noGradesText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  addSubjectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  addSubjectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createExamButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignSelf: 'center',
  },
  createExamButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  todayStudyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  todayStudyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayStudyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  todayStudyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.blue500,
  },
  groupsSection: {
    marginBottom: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  groupsContainer: {},
  groupsScrollContent: {
    padding: 10,
    alignItems: 'center',
  },
  groupChip: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    position: 'relative',
  },
  moreChip: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  moreChipContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreChipText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  moreChipArrow: {
    fontSize: 18,
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    zIndex: 1,
  },
  chipContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  chipName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  chipDescription: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
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
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 56,
    marginRight: 16,
    width: 220,
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
  },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  menuSection: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 14,
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
