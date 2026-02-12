import React, { useCallback, useEffect, useState, useLayoutEffect } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getApiUrl } from '@/config/api';
import Input from '@/components/Input';
import DatePicker from '@/components/DatePicker';
import BlockingLoader from '@/components/BlockingLoader';
import { CreateExamSchema } from '@/shared/schemas/grade';
import { apiFetch } from '@/utils/apiClient';
import { colors, Colors } from '@/constants/colors';
import { ExamTemplate } from '@/types/grade';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';

// 시험 생성 화면
const CreateExamScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ExamTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 템플릿 목록 조회
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await apiFetch<{ success?: boolean; data?: { templates?: ExamTemplate[] } }>(
        getApiUrl('/api/grades/templates'),
        {
          method: 'GET',
          requireAuth: true,
        },
      );
      const templates = data.data?.templates || [];
      // 디버깅: 템플릿 데이터 확인
      if (templates.length > 0) {
        console.log('Templates loaded:', templates);
        templates.forEach(template => {
          console.log(`Template ${template.template_name}:`, template.subjects);
        });
      }
      setTemplates(templates);
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    setNameError('');
    setDateError('');

    // 날짜를 YYYY-MM-DD 형식으로 변환
    const dateString = examDate.toISOString().split('T')[0];

    const parsed = CreateExamSchema.safeParse({
      exam_name: examName.trim(),
      exam_date: dateString,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first.path[0] === 'exam_name') {
        setNameError(first.message);
      } else if (first.path[0] === 'exam_date') {
        setDateError(first.message);
      }
      Alert.alert('오류', first.message);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{
        success?: boolean;
        message?: string;
        data?: { exam?: { id: string } };
      }>(getApiUrl('/api/grades/exams'), {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(parsed.data),
      });

      if (data?.success && data.data?.exam?.id) {
        const examId = data.data.exam.id;

        // 템플릿이 선택되었으면 과목들도 자동 생성
        if (selectedTemplate && selectedTemplate.subjects && selectedTemplate.subjects.length > 0) {
          try {
            console.log('Creating subjects from template:', selectedTemplate);
            await Promise.all(
              selectedTemplate.subjects.map(subject => {
                // max_score가 없거나 유효하지 않으면 기본값 100 사용
                const maxScore =
                  typeof subject.max_score === 'number' && subject.max_score > 0
                    ? subject.max_score
                    : 100;

                if (!subject.subject_name) {
                  console.warn('Subject name is missing:', subject);
                  return Promise.resolve();
                }

                const requestBody = {
                  exam_id: examId,
                  subject_name: subject.subject_name,
                  max_score: maxScore,
                  target_score: 0,
                };
                console.log('Creating subject:', requestBody);

                return apiFetch(getApiUrl('/api/grades'), {
                  method: 'POST',
                  requireAuth: true,
                  body: JSON.stringify(requestBody),
                });
              }),
            );
          } catch (e) {
            console.error('Error creating subjects from template:', e);
            // 과목 생성 실패해도 시험은 생성되었으므로 계속 진행
          }
        }

        Alert.alert(
          t('common.success'),
          t('grades.examCreated', { defaultValue: '시험이 생성되었습니다.' }),
          [
            {
              text: t('common.confirm'),
              onPress: () => router.push(`/grades/${examId}/subjects`),
            },
          ],
        );
      } else {
        Alert.alert(t('common.error'), data?.message ?? t('errors.generic'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), (e as Error).message ?? t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? Colors.dark.background : colors.white },
        ]}
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
          <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
            {t('grades.createExam')}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.form}>
              <Input
                label={t('grades.examName')}
                value={examName}
                onChangeText={setExamName}
                placeholder={t('grades.examNamePlaceholder', {
                  defaultValue: '예: 중간고사, 기말고사',
                })}
                errorText={nameError}
                autoCapitalize='none'
              />

              <DatePicker
                label={t('grades.examDate')}
                value={examDate}
                onChange={setExamDate}
                minimumDate={new Date()}
                errorText={dateError}
              />

              <View style={styles.templateSection}>
                <Text
                  style={[
                    styles.templateLabel,
                    { color: isDark ? colors.white : colors.textPrimary },
                  ]}
                >
                  시험 템플릿 선택 (선택사항)
                </Text>
                <Text
                  style={[
                    styles.templateDescription,
                    { color: isDark ? colors.gray300 : colors.textSecondary },
                  ]}
                >
                  템플릿을 선택하면 과목과 최고 점수가 자동으로 설정됩니다.
                </Text>
                {loadingTemplates ? (
                  <Text
                    style={[
                      styles.loadingText,
                      { color: isDark ? colors.gray300 : colors.textSecondary },
                    ]}
                  >
                    템플릿 로딩 중...
                  </Text>
                ) : (
                  <FlatList
                    data={templates}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.templateCard,
                          {
                            backgroundColor: isDark
                              ? selectedTemplate?.id === item.id
                                ? colors.gray800
                                : colors.gray800
                              : selectedTemplate?.id === item.id
                              ? colors.blue50
                              : colors.gray100,
                          },
                          selectedTemplate?.id === item.id && styles.templateCardSelected,
                        ]}
                        onPress={() =>
                          setSelectedTemplate(selectedTemplate?.id === item.id ? null : item)
                        }
                      >
                        <Text
                          style={[
                            styles.templateName,
                            selectedTemplate?.id === item.id && styles.templateNameSelected,
                            { color: isDark ? colors.white : colors.textPrimary },
                          ]}
                        >
                          {item.template_name}
                        </Text>
                        {item.description && (
                          <Text
                            style={[
                              styles.templateDesc,
                              { color: isDark ? colors.gray300 : colors.textSecondary },
                            ]}
                          >
                            {item.description}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.templateSubjects,
                            { color: isDark ? colors.gray400 : colors.textTertiary },
                          ]}
                        >
                          {item.subjects.length}개 과목
                        </Text>
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.templateList}
                  />
                )}
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.createButtonDisabled]}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>{t('grades.createExam')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <BlockingLoader
        visible={loading}
        message={t('grades.creating', { defaultValue: '시험 생성 중...' })}
      />
    </>
  );
};

export default CreateExamScreen;

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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  placeholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  createButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.blue500,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  templateSection: {
    marginTop: 16,
  },
  templateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  templateList: {
    paddingVertical: 8,
  },
  templateCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: colors.blue500,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateNameSelected: {
    color: colors.blue500,
  },
  templateDesc: {
    fontSize: 11,
    marginBottom: 4,
  },
  templateSubjects: {
    fontSize: 11,
  },
});
