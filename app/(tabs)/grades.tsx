import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getApiUrl } from '@/config/api';
import { ExamWithGrades } from '@/types/grade';
import { useAuth } from '@/contexts/AuthContext';
import BlockingLoader from '@/components/BlockingLoader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { apiFetch } from '@/utils/apiClient';
import { colors, Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AppModal from '@/components/AppModal';

// 시험 관리 탭 (시험 목록)
const GradesScreen = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [exams, setExams] = useState<ExamWithGrades[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({
    visible: false,
    message: '',
  });

  // 시험 목록 조회
  const fetchExams = async () => {
    try {
      const data = await apiFetch<{ data?: { exams?: ExamWithGrades[] } }>(
        getApiUrl('/api/grades/exams'),
        {
          method: 'GET',
          requireAuth: true,
        },
      );
      setExams(data.data?.exams || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setErrorModal({
        visible: true,
        message: '시험 목록을 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchExams();
    } else {
      setLoading(false);
    }
  }, [user]);

  // 화면 포커스 시 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchExams();
      }
    }, [user]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchExams();
    setRefreshing(false);
  };

  const handleCreateExam = () => {
    router.push('/grades/create');
  };

  const handleExamPress = (examId: string) => {
    router.push(`/grades/${examId}/subjects`);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  };

  const renderExamCard = ({ item }: { item: ExamWithGrades }) => {
    const dDay = calculateDDay(item.exam_date);
    const isUpcoming = dDay >= 0 && dDay <= 7;
    const subjectCount = item.grades?.length || 0;

    // 종합 달성률 계산: (실제 종합 점수 / 목표 종합 점수 * 100)
    let achievementRate = 0;
    let totalTargetScore = 0;
    let totalCurrentScore = 0;
    if (subjectCount > 0 && item.grades) {
      totalTargetScore = item.grades.reduce((sum, grade) => sum + grade.target_score, 0);
      totalCurrentScore = item.grades.reduce((sum, grade) => sum + (grade.current_score ?? 0), 0);
      if (totalTargetScore > 0) {
        achievementRate = Math.round((totalCurrentScore / totalTargetScore) * 100);
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: isDark ? colors.gray800 : colors.white },
          isUpcoming && styles.cardUpcoming,
        ]}
        onPress={() => handleExamPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.examName, { color: isDark ? colors.white : colors.textPrimary }]}>
            {item.exam_name}
          </Text>
          {isUpcoming && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>D-{dDay}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.examDate, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
            {formatDate(item.exam_date)}
          </Text>
          {subjectCount > 0 ? (
            <View style={styles.achievementContainer}>
              <View>
                <Text
                  style={[styles.achievementLabel, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                >
                  종합 점수
                </Text>
                <Text style={[styles.achievementDetail, { color: isDark ? colors.white : colors.textPrimary }]}>
                  {totalCurrentScore}/{totalTargetScore}점
                </Text>
              </View>
              <View style={styles.achievementRight}>
                <Text
                  style={[styles.achievementLabel, { color: isDark ? colors.gray300 : colors.textSecondary }]}
                >
                  달성률
                </Text>
                <Text style={styles.achievementRate}>{achievementRate}%</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.subjectCount, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
              과목 없음
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <BlockingLoader visible={true} message='시험 목록을 불러오는 중...' />;
  }

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
        <Text style={[styles.title, { color: isDark ? colors.white : colors.textPrimary }]}>
          시험 관리
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateExam}>
          <IconSymbol name='add' size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {exams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name='description' size={64} color={colors.gray400} />
          <Text style={[styles.emptyText, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
            등록된 시험이 없습니다
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleCreateExam}>
            <Text style={styles.emptyButtonText}>시험 추가하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={exams}
          renderItem={renderExamCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <AppModal
        visible={errorModal.visible}
        onRequestClose={() =>
          setErrorModal(prev => ({
            ...prev,
            visible: false,
          }))
        }
        title='오류'
        subtitle={errorModal.message}
        animationType='fade'
        type='confirm'
        confirmText='확인'
        confirmVariant='danger'
        onConfirm={() =>
          setErrorModal(prev => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardUpcoming: {
    borderLeftWidth: 4,
    borderLeftColor: colors.blue500,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  examName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    backgroundColor: colors.blue500,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subjectCount: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  achievementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  achievementDetail: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  achievementRight: {
    alignItems: 'flex-end',
  },
  achievementRate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.blue500,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GradesScreen;
