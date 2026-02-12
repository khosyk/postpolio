import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { getApiUrl } from '@/config/api';
import BlockingLoader from '@/components/BlockingLoader';
import { ExamWithGrades } from '@/types/grade';
import { apiFetch, AuthError } from '@/utils/apiClient';
import { colors, Colors } from '@/constants/colors';
import Input from '@/components/Input';
import { CreateGradeSchema } from '@/shared/schemas/grade';
import RadarChart from '@/components/RadarChart';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

// 시험 상세 화면 (과목별 점수 설정)
const ExamSubjectsScreen = () => {
  const params = useLocalSearchParams<{ examId: string | string[] }>();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const examId = Array.isArray(params.examId) ? params.examId[0] : params.examId;
  const [exam, setExam] = useState<ExamWithGrades | null>(null);

  // Stack 네비게이션 헤더 숨기기
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  const [loading, setLoading] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [targetScore, setTargetScore] = useState('');
  const [currentScore, setCurrentScore] = useState('');
  const [subjectError, setSubjectError] = useState('');
  // 각 과목별 임시 점수 저장 (입력 버튼 클릭 전까지)
  const [tempScores, setTempScores] = useState<Record<string, string>>({});
  // 각 과목별 임시 최고점 저장
  const [tempMaxScores, setTempMaxScores] = useState<Record<string, string>>({});
  // 각 과목별 임시 목표점 저장
  const [tempTargetScores, setTempTargetScores] = useState<Record<string, string>>({});
  // 각 과목별 임시 과목명 저장
  const [tempSubjectNames, setTempSubjectNames] = useState<Record<string, string>>({});
  const [updatingScores, setUpdatingScores] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingExam, setDeletingExam] = useState(false);

  const fetchExam = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ success?: boolean; data?: { exam?: ExamWithGrades } }>(
        getApiUrl(`/api/grades/exams/${examId}`),
        {
          method: 'GET',
          requireAuth: true,
        },
      );

      if (data.success && data.data?.exam) {
        // grades가 없으면 빈 배열로 초기화
        const examData: ExamWithGrades = {
          ...data.data.exam,
          grades: data.data.exam.grades || [],
        };
        setExam(examData);
      } else {
        Alert.alert('오류', '시험 정보를 불러올 수 없습니다.');
        router.back();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error fetching exam:', e);
      if (!(e instanceof AuthError)) {
        const errorMessage = (e as Error).message || '시험 정보를 불러오는 중 오류가 발생했습니다.';
        Alert.alert('오류', errorMessage);
      }
      router.back();
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) {
      void fetchExam();
    }
  }, [examId, fetchExam]);

  const handleAddSubject = async () => {
    if (!examId || !exam) return;
    setSubjectError('');

    const parsedMaxScore = maxScore ? Number(maxScore) : 100;
    const parsedTargetScore = targetScore ? Number(targetScore) : undefined;
    const parsedCurrentScore = currentScore ? Number(currentScore) : undefined;

    if (parsedMaxScore < 1 || parsedMaxScore > 10000) {
      Alert.alert('오류', '최고 점수는 1 이상 10000 이하여야 합니다.');
      return;
    }

    if (
      parsedTargetScore !== undefined &&
      (parsedTargetScore < 0 || parsedTargetScore > parsedMaxScore)
    ) {
      Alert.alert('오류', `목표 점수는 0 이상 ${parsedMaxScore} 이하여야 합니다.`);
      return;
    }
    if (
      parsedCurrentScore !== undefined &&
      (parsedCurrentScore < 0 || parsedCurrentScore > parsedMaxScore)
    ) {
      Alert.alert('오류', `현재 점수는 0 이상 ${parsedMaxScore} 이하여야 합니다.`);
      return;
    }

    const parsed = CreateGradeSchema.safeParse({
      exam_id: examId,
      subject_name: subjectName.trim(),
      max_score: parsedMaxScore,
      target_score: parsedTargetScore,
      current_score: parsedCurrentScore,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first.path[0] === 'subject_name') {
        setSubjectError(first.message);
      }
      Alert.alert('오류', first.message);
      return;
    }

    setAddingSubject(true);
    try {
      const data = await apiFetch<{
        success?: boolean;
        message?: string;
        data?: { gradeRecord?: ExamWithGrades['grades'][0] };
      }>(getApiUrl('/api/grades'), {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(parsed.data),
      });

      if (data?.success && data.data?.gradeRecord) {
        // 로컬 상태만 업데이트 (전체 리렌더링 방지)
        setExam(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            grades: [...prev.grades, data.data!.gradeRecord!],
          };
        });
        setSubjectName('');
        setMaxScore('100');
        setTargetScore('');
        setCurrentScore('');
        setShowAddModal(false);
      } else {
        Alert.alert('오류', data?.message ?? '과목 추가 중 오류가 발생했습니다.');
      }
    } catch (e) {
      Alert.alert('오류', (e as Error).message ?? '과목 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingSubject(false);
    }
  };

  // 점수 입력값 변경 (임시 저장만)
  const handleScoreChange = useCallback((gradeId: string, value: string) => {
    setTempScores(prev => ({
      ...prev,
      [gradeId]: value,
    }));
  }, []);

  // 최고점 입력값 변경 (임시 저장만)
  const handleMaxScoreChange = useCallback((gradeId: string, value: string) => {
    setTempMaxScores(prev => ({
      ...prev,
      [gradeId]: value,
    }));
  }, []);

  // 목표점 입력값 변경 (임시 저장만)
  const handleTargetScoreChange = useCallback((gradeId: string, value: string) => {
    setTempTargetScores(prev => ({
      ...prev,
      [gradeId]: value,
    }));
  }, []);

  // 과목명 변경 (임시 저장만)
  const handleSubjectNameChange = useCallback((gradeId: string, value: string) => {
    setTempSubjectNames(prev => ({
      ...prev,
      [gradeId]: value,
    }));
  }, []);

  // 과목 정보 업데이트 (과목명 / 현재 점수 / 최고점 / 목표 점수)
  const handleUpdateGrade = useCallback(
    async (
      gradeId: string,
      scoreValue: string,
      maxScoreValue?: string,
      subjectNameValue?: string,
      targetScoreValue?: string,
    ) => {
      const numValue = scoreValue ? Number(scoreValue) : null;
      const grade = exam?.grades.find(g => g.id === gradeId);
      const currentMaxScore = grade?.max_score || 100;
      const newMaxScore = maxScoreValue ? Number(maxScoreValue) : currentMaxScore;
      const targetNumValueRaw =
        targetScoreValue !== undefined && targetScoreValue !== ''
          ? Number(targetScoreValue)
          : grade?.target_score ?? 0;

      // 최고점 검증 (1 ~ 1000)
      if (maxScoreValue) {
        if (isNaN(newMaxScore) || newMaxScore < 1 || newMaxScore > 1000) {
          Alert.alert('오류', '최고 점수는 1 이상 1000 이하여야 합니다.');
          return;
        }
      }

      // 목표 점수 검증 (0 ~ newMaxScore, 최대 1000)
      let validTargetScore = grade?.target_score ?? 0;
      if (targetScoreValue !== undefined && targetScoreValue !== '') {
        if (isNaN(targetNumValueRaw) || targetNumValueRaw < 0) {
          Alert.alert('오류', '목표 점수는 0 이상이어야 합니다.');
          return;
        }
        if (targetNumValueRaw > newMaxScore) {
          Alert.alert('오류', `목표 점수는 최고 점수(${newMaxScore}점) 이하여야 합니다.`);
          return;
        }
        if (targetNumValueRaw > 1000) {
          Alert.alert('오류', '목표 점수는 1000 이하여야 합니다.');
          return;
        }
        validTargetScore = targetNumValueRaw;
      }

      // 현재 점수 검증 (0 ~ newMaxScore)
      if (numValue !== null) {
        if (numValue < 0) {
          Alert.alert('오류', '현재 점수는 0 이상이어야 합니다.');
          return;
        }
        if (numValue > newMaxScore) {
          Alert.alert('오류', `현재 점수는 최고 점수(${newMaxScore}점)를 넘을 수 없습니다.`);
          return;
        }
      }

      // 과목명 검증
      const trimmedName = (subjectNameValue ?? grade?.subject_name ?? '').trim();
      if (!trimmedName) {
        Alert.alert('오류', '과목명을 입력해주세요.');
        return;
      }
      if (trimmedName.length > 50) {
        Alert.alert('오류', '과목명은 최대 50자까지 가능합니다.');
        return;
      }

      setUpdatingScores(prev => ({ ...prev, [gradeId]: true }));
      try {
        const updateData: {
          subject_name?: string;
          current_score?: number | null;
          max_score?: number;
          target_score?: number;
        } = {};
        if (trimmedName && trimmedName !== grade?.subject_name) {
          updateData.subject_name = trimmedName;
        }
        if (scoreValue !== undefined) {
          updateData.current_score = numValue;
        }
        if (maxScoreValue !== undefined && newMaxScore !== currentMaxScore) {
          updateData.max_score = newMaxScore;
        }
        if (targetScoreValue !== undefined && targetScoreValue !== '') {
          if (validTargetScore !== grade?.target_score) {
            updateData.target_score = validTargetScore;
          }
        }

        const data = await apiFetch<{ success?: boolean; message?: string }>(
          getApiUrl(`/api/grades/${gradeId}`),
          {
            method: 'PUT',
            requireAuth: true,
            body: JSON.stringify(updateData),
          },
        );

        if (data?.success) {
          // 임시 값 제거
          setTempScores(prev => {
            const next = { ...prev };
            delete next[gradeId];
            return next;
          });
          setTempMaxScores(prev => {
            const next = { ...prev };
            delete next[gradeId];
            return next;
          });
          setTempTargetScores(prev => {
            const next = { ...prev };
            delete next[gradeId];
            return next;
          });
          setTempSubjectNames(prev => {
            const next = { ...prev };
            delete next[gradeId];
            return next;
          });
          // 로컬 상태만 업데이트 (전체 리렌더링 방지)
          setExam(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              grades: prev.grades.map(gradeItem =>
                gradeItem.id === gradeId
                  ? {
                      ...gradeItem,
                      current_score: numValue,
                      max_score: maxScoreValue ? newMaxScore : gradeItem.max_score,
                      target_score:
                        targetScoreValue !== undefined && targetScoreValue !== ''
                          ? validTargetScore
                          : gradeItem.target_score,
                      subject_name: trimmedName,
                    }
                  : gradeItem,
              ),
            };
          });
        } else {
          Alert.alert('오류', data?.message ?? '점수 업데이트 중 오류가 발생했습니다.');
        }
      } catch (e) {
        Alert.alert('오류', (e as Error).message ?? '점수 업데이트 중 오류가 발생했습니다.');
      } finally {
        setUpdatingScores(prev => ({ ...prev, [gradeId]: false }));
      }
    },
    [exam?.grades],
  );

  // 과목 삭제
  const handleDeleteGrade = useCallback(async (gradeId: string, subjectName: string) => {
    Alert.alert('삭제 확인', `${subjectName} 과목을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeletingIds(prev => new Set(prev).add(gradeId));
          try {
            const data = await apiFetch<{ success?: boolean; message?: string }>(
              getApiUrl(`/api/grades/${gradeId}`),
              {
                method: 'DELETE',
                requireAuth: true,
              },
            );

            if (data?.success) {
              // 로컬 상태만 업데이트 (전체 리렌더링 방지)
              setExam(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  grades: prev.grades.filter(grade => grade.id !== gradeId),
                };
              });
            } else {
              Alert.alert('오류', data?.message ?? '과목 삭제 중 오류가 발생했습니다.');
            }
          } catch (e) {
            Alert.alert('오류', (e as Error).message ?? '과목 삭제 중 오류가 발생했습니다.');
          } finally {
            setDeletingIds(prev => {
              const next = new Set(prev);
              next.delete(gradeId);
              return next;
            });
          }
        },
      },
    ]);
  }, []);

  // 시험 삭제
  const handleDeleteExam = useCallback(() => {
    if (!examId || !exam) return;

    Alert.alert('시험 삭제', '이 시험과 모든 과목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeletingExam(true);
          try {
            const data = await apiFetch<{ success?: boolean; message?: string }>(
              getApiUrl(`/api/grades/exams/${examId}`),
              {
                method: 'DELETE',
                requireAuth: true,
              },
            );

            if (data?.success) {
              Alert.alert('완료', '시험이 삭제되었습니다.', [
                {
                  text: '확인',
                  onPress: () => router.back(),
                },
              ]);
            } else {
              Alert.alert('오류', data?.message ?? '시험 삭제 중 오류가 발생했습니다.');
            }
          } catch (e) {
            Alert.alert('오류', (e as Error).message ?? '시험 삭제 중 오류가 발생했습니다.');
          } finally {
            setDeletingExam(false);
          }
        },
      },
    ]);
  }, [examId, exam]);

  const summary = useMemo(() => {
    if (!exam || !exam.grades || exam.grades.length === 0) {
      return {
        totalTarget: 0,
        totalCurrent: 0,
        rate: 0,
      };
    }

    const totalTarget = exam.grades.reduce((sum, grade) => sum + grade.target_score, 0);
    const totalCurrent = exam.grades.reduce((sum, grade) => sum + (grade.current_score ?? 0), 0);
    const rate = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    return {
      totalTarget,
      totalCurrent,
      rate,
    };
  }, [exam]);

  // 그래프 데이터는 exam.grades의 실제 값이 변경될 때만 재계산
  // tempScores 변경 시에는 재계산되지 않도록 grades의 실제 값들을 기반으로 의존성 생성
  const gradesDataKey = useMemo(() => {
    if (!exam?.grades) return '';
    // 각 grade의 id, target_score, current_score만 추출하여 안정적인 키 생성
    return exam.grades
      .map(g => `${g.id}:${g.target_score}:${g.current_score ?? 'null'}`)
      .sort()
      .join('|');
  }, [exam?.grades]);

  const radarChartData = useMemo(() => {
    if (!exam?.grades || exam.grades.length < 3) return null;
    return exam.grades.map(grade => ({
      subject: grade.subject_name,
      target: grade.target_score,
      current: grade.current_score ?? undefined,
    }));
  }, [gradesDataKey, exam?.grades]);

  if (!examId) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? Colors.dark.background : colors.white },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[styles.loadingText, { color: isDark ? colors.white : colors.textSecondary }]}
          >
            시험 ID가 없습니다
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? Colors.dark.background : colors.white },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[styles.loadingText, { color: isDark ? colors.white : colors.textSecondary }]}
          >
            로딩 중...
          </Text>
        </View>
      </View>
    );
  }

  if (!exam) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? Colors.dark.background : colors.white },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[styles.loadingText, { color: isDark ? colors.white : colors.textSecondary }]}
          >
            시험 정보를 불러올 수 없습니다
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol
            name='arrow-back'
            size={24}
            color={isDark ? colors.white : colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exam.exam_name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.summaryCard, { backgroundColor: isDark ? colors.gray800 : colors.white }]}
        >
          <View style={styles.summaryHeaderRow}>
            <View style={styles.summaryTitleArea}>
              <Text
                style={[styles.examName, { color: isDark ? colors.white : colors.textPrimary }]}
              >
                {exam.exam_name}
              </Text>
              <Text
                style={[styles.examDate, { color: isDark ? colors.gray300 : colors.textSecondary }]}
              >
                {new Date(exam.exam_date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <View style={styles.summaryStatsRow}>
                <View>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: isDark ? colors.gray300 : colors.textSecondary },
                    ]}
                  >
                    종합 점수
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: isDark ? colors.white : colors.textPrimary },
                    ]}
                  >
                    {summary.totalCurrent}/{summary.totalTarget}점
                  </Text>
                </View>
                <View style={styles.summaryRight}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: isDark ? colors.gray300 : colors.textSecondary },
                    ]}
                  >
                    달성률
                  </Text>
                  <Text style={styles.summaryRate}>{summary.rate}%</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.examDeleteButton}
              onPress={handleDeleteExam}
              disabled={deletingExam}
            >
              <IconSymbol
                name='delete'
                size={22}
                color={deletingExam ? colors.gray400 : colors.red500}
              />
            </TouchableOpacity>
          </View>

          {radarChartData ? (
            <View style={styles.radarWrapper}>
              <RadarChart data={radarChartData} />
            </View>
          ) : exam.grades && exam.grades.length > 0 ? (
            <View style={styles.simpleStatsWrapper}>
              {exam.grades.slice(0, 2).map(grade => (
                <View
                  key={grade.id}
                  style={[
                    styles.simpleStatBox,
                    { backgroundColor: isDark ? colors.gray900 : colors.gray100 },
                  ]}
                >
                  <Text
                    style={[
                      styles.simpleStatSubject,
                      { color: isDark ? colors.white : colors.textPrimary },
                    ]}
                  >
                    {grade.subject_name}
                  </Text>
                  <Text
                    style={[
                      styles.simpleStatScore,
                      { color: isDark ? colors.white : colors.textPrimary },
                    ]}
                  >
                    {grade.current_score ?? 0}/{grade.target_score}점
                  </Text>
                  <Text
                    style={[
                      styles.simpleStatSub,
                      { color: isDark ? colors.gray300 : colors.textSecondary },
                    ]}
                  >
                    목표까지 {Math.max(0, grade.target_score - (grade.current_score ?? 0))}점 남음
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChartContainer}>
              <Text
                style={[
                  styles.emptyChartText,
                  { color: isDark ? colors.gray300 : colors.textSecondary },
                ]}
              >
                과목을 추가하여
              </Text>
              <Text
                style={[
                  styles.emptyChartText,
                  { color: isDark ? colors.gray300 : colors.textSecondary },
                ]}
              >
                성적 차트를 확인하세요
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.addSubjectFab,
              (!exam.grades || exam.grades.length === 0) && styles.addSubjectFabHighlighted,
            ]}
            onPress={() => setShowAddModal(true)}
            disabled={addingSubject}
          >
            <IconSymbol name='add' size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.subjectsSection,
            { backgroundColor: isDark ? colors.gray800 : colors.white },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: isDark ? colors.white : colors.textPrimary }]}
          >
            과목 목록
          </Text>

          {/* 과목 목록 */}
          {exam.grades && exam.grades.length > 0 ? (
            <FlatList
              data={exam.grades}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const maxScore = item.max_score || 100;
                const tempScore = tempScores[item.id];
                const displayScore =
                  tempScore !== undefined ? tempScore : item.current_score?.toString() || '';
                const isUpdating = updatingScores[item.id] || false;
                const isDeleting = deletingIds.has(item.id);

                const tempMaxScore = tempMaxScores[item.id];
                const displayMaxScore =
                  tempMaxScore !== undefined ? tempMaxScore : item.max_score?.toString() || '100';
                const tempSubjectName = tempSubjectNames[item.id];
                const tempTargetScore = tempTargetScores[item.id];
                const displaySubjectName =
                  tempSubjectName !== undefined ? tempSubjectName : item.subject_name;
                const hasChanges =
                  (tempScore !== undefined && tempScore !== item.current_score?.toString()) ||
                  (tempMaxScore !== undefined && tempMaxScore !== item.max_score?.toString()) ||
                  (tempTargetScore !== undefined &&
                    tempTargetScore !== item.target_score?.toString()) ||
                  (tempSubjectName !== undefined && tempSubjectName !== item.subject_name);

                return (
                  <View
                    style={[
                      styles.subjectCard,
                      {
                        backgroundColor: isDark ? colors.gray800 : colors.white,
                        borderBottomColor: isDark ? colors.gray700 : colors.gray200,
                      },
                      isDeleting && styles.subjectCardDeleting,
                    ]}
                  >
                    <View style={styles.subjectHeader}>
                      <TextInput
                        style={[
                          styles.subjectName,
                          {
                            color: isDark ? colors.white : colors.textPrimary,
                            borderColor: isDark ? colors.gray700 : colors.gray300,
                            backgroundColor: isDark ? colors.gray900 : colors.white,
                          },
                        ]}
                        value={displaySubjectName}
                        onChangeText={value => handleSubjectNameChange(item.id, value)}
                        placeholder='과목명'
                        placeholderTextColor={isDark ? colors.gray500 : colors.textTertiary}
                        autoCapitalize='none'
                        maxLength={50}
                        editable={!isUpdating && !isDeleting}
                      />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteGrade(item.id, item.subject_name)}
                        disabled={isDeleting}
                      >
                        <IconSymbol
                          name='delete'
                          size={20}
                          color={isDeleting ? colors.gray400 : colors.red500}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.scoreInputRow}>
                      <View style={styles.scoreInputGroup}>
                        <Text
                          style={[
                            styles.scoreInputLabel,
                            { color: isDark ? colors.gray300 : colors.textSecondary },
                          ]}
                        >
                          현재 점수
                        </Text>
                        <View style={styles.scoreInputContainer}>
                          <TextInput
                            style={[
                              styles.scoreInput,
                              {
                                backgroundColor: isDark ? colors.gray900 : colors.white,
                                borderColor: isDark ? colors.gray700 : colors.gray200,
                                color: isDark ? colors.white : colors.textPrimary,
                              },
                            ]}
                            value={displayScore}
                            onChangeText={value => handleScoreChange(item.id, value)}
                            placeholder='점수 입력'
                            placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                            keyboardType='numeric'
                            editable={!isUpdating && !isDeleting}
                          />
                        </View>
                      </View>
                      <View style={styles.scoreInputGroup}>
                        <Text
                          style={[
                            styles.scoreInputLabel,
                            { color: isDark ? colors.gray300 : colors.textSecondary },
                          ]}
                        >
                          최고 점수
                        </Text>
                        <View style={styles.scoreInputContainer}>
                          <TextInput
                            style={[
                              styles.scoreInput,
                              {
                                backgroundColor: isDark ? colors.gray900 : colors.white,
                                borderColor: isDark ? colors.gray700 : colors.gray200,
                                color: isDark ? colors.white : colors.textPrimary,
                              },
                            ]}
                            value={displayMaxScore}
                            onChangeText={value => handleMaxScoreChange(item.id, value)}
                            placeholder='최고점'
                            placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                            keyboardType='numeric'
                            editable={!isUpdating && !isDeleting}
                          />
                        </View>
                      </View>
                      <View style={styles.scoreInputGroup}>
                        <Text
                          style={[
                            styles.scoreInputLabel,
                            { color: isDark ? colors.gray300 : colors.textSecondary },
                          ]}
                        >
                          목표 점수
                        </Text>
                        <View style={styles.scoreInputContainer}>
                          <TextInput
                            style={[
                              styles.scoreInput,
                              {
                                backgroundColor: isDark ? colors.gray900 : colors.white,
                                borderColor: isDark ? colors.gray700 : colors.gray200,
                                color: isDark ? colors.white : colors.textPrimary,
                              },
                            ]}
                            value={
                              tempTargetScore !== undefined
                                ? tempTargetScore
                                : item.target_score?.toString() || ''
                            }
                            onChangeText={value => handleTargetScoreChange(item.id, value)}
                            placeholder='목표점'
                            placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                            keyboardType='numeric'
                            editable={!isUpdating && !isDeleting}
                          />
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.updateButton,
                          (isUpdating || !hasChanges) && styles.updateButtonDisabled,
                        ]}
                        onPress={() =>
                          handleUpdateGrade(
                            item.id,
                            tempScore !== undefined
                              ? tempScore
                              : item.current_score?.toString() || '',
                            tempMaxScore !== undefined ? tempMaxScore : item.max_score?.toString(),
                            displaySubjectName,
                            tempTargetScore !== undefined
                              ? tempTargetScore
                              : item.target_score?.toString() || '',
                          )
                        }
                        disabled={isUpdating || !hasChanges || isDeleting}
                      >
                        <Text style={styles.updateButtonText}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>과목을 추가해주세요</Text>
          )}
        </View>
      </ScrollView>
      {/* 과목 추가 모달 */}
      <Modal
        transparent
        visible={showAddModal}
        animationType='fade'
        onRequestClose={() => {
          if (!addingSubject) {
            setShowAddModal(false);
          }
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!addingSubject) {
              setShowAddModal(false);
            }
          }}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? colors.gray800 : colors.white },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: isDark ? colors.white : colors.textPrimary }]}
            >
              과목 추가
            </Text>
            <Input
              label='과목명'
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder='과목명을 입력하세요'
              errorText={subjectError}
            />
            <Input
              label='최고 점수'
              value={maxScore}
              onChangeText={setMaxScore}
              placeholder='예: 100, 150, 200'
              keyboardType='numeric'
            />
            <Input
              label='목표 점수'
              value={targetScore}
              onChangeText={setTargetScore}
              placeholder='목표 점수를 입력하세요'
              keyboardType='numeric'
            />
            <Input
              label='현재 점수 (선택)'
              value={currentScore}
              onChangeText={setCurrentScore}
              placeholder='현재 점수를 입력하세요'
              keyboardType='numeric'
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { backgroundColor: isDark ? colors.gray700 : colors.gray200 },
                ]}
                onPress={() => {
                  if (!addingSubject) {
                    setShowAddModal(false);
                  }
                }}
                disabled={addingSubject}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    { color: isDark ? colors.gray300 : colors.textPrimary },
                  ]}
                >
                  취소
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleAddSubject}
                disabled={addingSubject}
              >
                <Text style={styles.modalConfirmText}>{addingSubject ? '추가 중...' : '추가'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <BlockingLoader visible={addingSubject || deletingExam} message='처리 중...' />
    </>
  );
};

export default ExamSubjectsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryTitleArea: {
    flex: 1,
    paddingRight: 8,
  },
  examName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  examDate: {
    fontSize: 14,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryRate: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.blue500,
  },
  examDeleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  radarWrapper: {
    marginTop: 4,
  },
  addSubjectFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue500,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addSubjectFabHighlighted: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue600,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    minHeight: 200,
  },
  emptyChartText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  simpleStatsWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  simpleStatBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.gray100,
  },
  simpleStatSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  simpleStatScore: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.blue500,
    marginBottom: 2,
  },
  simpleStatSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subjectsSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subjectCard: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subjectCardDeleting: {
    opacity: 0.5,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    flex: 1,
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  scoreInputGroup: {
    flex: 1,
  },
  scoreInputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    minWidth: 70,
    textAlign: 'center',
    flex: 1,
  },
  updateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.blue500,
  },
  updateButtonDisabled: {
    backgroundColor: colors.gray300,
    opacity: 0.5,
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelButton: {
    // backgroundColor는 동적으로 설정
  },
  modalConfirmButton: {
    backgroundColor: colors.blue500,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
