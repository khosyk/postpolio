import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import BlockingLoader from '@/components/BlockingLoader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import MinutePicker from '@/components/MinutePicker';
import CircularProgress from '@/components/CircularProgress';
import CheckmarkAnimation from '@/components/CheckmarkAnimation';
import { apiFetch } from '@/utils/apiClient';
import { colors, pomodoroColors, Colors } from '@/constants/colors';
import { PomodoroSession, PomodoroSettings } from '@/types/pomodoro';
import { useColorScheme } from '@/hooks/useColorScheme';
import AppModal from '@/components/AppModal';

const STORAGE_KEY = 'pomodoro_session';

// 포모도로 타이머 탭
const PomodoroScreen = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const [settings, setSettings] = useState<PomodoroSettings>({
    study_duration: 25,
    break_duration: 5,
  });
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [autoContinue] = useState(true); // 자동 전환 활성화 여부
  const [todayCycleCount, setTodayCycleCount] = useState(0);
  const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);
  const [todayStatsLoading, setTodayStatsLoading] = useState(false);
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
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number>(Date.now());

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

  // 설정 조회
  const fetchSettings = async () => {
    try {
      const data = await apiFetch<{ data?: { settings?: PomodoroSettings } }>(
        getApiUrl('/api/pomodoro/settings'),
        {
          method: 'GET',
          requireAuth: true,
        },
      );
      if (data.data?.settings) {
        setSettings(data.data.settings);
      }
    } catch {
      // 설정 조회 실패 시 기본값 사용
    }
  };

  // 오늘 통계 조회 (00:00 ~ 24:00)
  const fetchTodayStats = async () => {
    if (!user) return;

    setTodayStatsLoading(true);
    try {
      const data = await apiFetch<{ data?: { sessions?: PomodoroSession[] } }>(
        getApiUrl('/api/pomodoro/sessions?limit=500'),
        {
          method: 'GET',
          requireAuth: true,
        },
      );

      const sessions = data.data?.sessions || [];

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const todaySessions = sessions.filter(s => {
        if (s.status !== 'completed') return false;
        const created = new Date(s.created_at);
        return created >= startOfDay && created < endOfDay;
      });

      // 공부 시간 합계 (study 세션만)
      const studySessions = todaySessions.filter(s => s.type === 'study');
      const totalStudyMinutes = studySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      setTodayStudyMinutes(totalStudyMinutes);

      // 완료 세트 수: 순수 공부 라운드 개수 (휴식 포함 X)
      const completedStudyRounds = studySessions.length;
      setTodayCycleCount(completedStudyRounds);
    } catch {
      // 통계 조회 실패는 무시
    } finally {
      setTodayStatsLoading(false);
    }
  };

  // 세션 시작
  const handleStartSession = async (type: 'study' | 'break') => {
    try {
      const duration = type === 'study' ? settings.study_duration : settings.break_duration;
      const data = await apiFetch<{ data?: { session?: PomodoroSession } }>(
        getApiUrl('/api/pomodoro/sessions'),
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            type,
            duration_minutes: duration,
          }),
        },
      );
      if (data.data?.session) {
        const newSession = data.data.session;
        setSession(newSession);
        setRemainingSeconds(duration * 60);
        setIsRunning(true);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            sessionId: newSession.id,
            startTime: Date.now(),
            duration: duration * 60,
            type,
          }),
        );

        // 공부 세션일 때만 로컬 알림으로 상태 표시
        if (type === 'study') {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '공부 집중 중',
                body: '딥웰스터디 포모도로 세션이 진행 중입니다.',
              },
              trigger: null,
            });
          } catch {
            // 알림 실패는 무시
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error starting session:', error);
      showError('세션 시작 중 오류가 발생했습니다.');
    }
  };

  // 다음 세션 자동 시작
  const startNextSession = async (currentType: 'study' | 'break') => {
    if (!autoContinue) return;

    const nextType = currentType === 'study' ? 'break' : 'study';

    // 애니메이션 완료 후 다음 세션 시작
    setTimeout(async () => {
      try {
        const duration = nextType === 'study' ? settings.study_duration : settings.break_duration;
        const data = await apiFetch<{ data?: { session?: PomodoroSession } }>(
          getApiUrl('/api/pomodoro/sessions'),
          {
            method: 'POST',
            requireAuth: true,
            body: JSON.stringify({
              type: nextType,
              duration_minutes: duration,
            }),
          },
        );
        if (data.data?.session) {
          const newSession = data.data.session;
          setSession(newSession);
          setRemainingSeconds(duration * 60);
          setIsRunning(true);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              sessionId: newSession.id,
              startTime: Date.now(),
              duration: duration * 60,
              type: nextType,
            }),
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error starting next session:', error);
      }
    }, 1500); // 체크 애니메이션 완료 후 시작
  };

  // 세션 완료
  const handleCompleteSession = async () => {
    if (!session) return;

    const currentType = session.type;

    // 완료 애니메이션 표시
    setShowCompletionAnimation(true);

    try {
      await apiFetch(getApiUrl(`/api/pomodoro/sessions/${session.id}/complete`), {
        method: 'PUT',
        requireAuth: true,
      });

      // 공부 세션 완료 시 진행 중 알림 정리
      if (currentType === 'study') {
        try {
          await Notifications.dismissAllNotificationsAsync();
        } catch {
          // 무시
        }
      }

      // 자동 전환이 활성화되어 있으면 다음 세션 시작
      if (autoContinue) {
        startNextSession(currentType);
      } else {
        setTimeout(async () => {
          setSession(null);
          setRemainingSeconds(0);
          setIsRunning(false);
          await AsyncStorage.removeItem(STORAGE_KEY);
        }, 2000);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error completing session:', error);
      setSession(null);
      setRemainingSeconds(0);
      setIsRunning(false);
    }
  };

  const performCancelSession = async () => {
    if (!session) return;
    try {
      await apiFetch(getApiUrl(`/api/pomodoro/sessions/${session.id}/cancel`), {
        method: 'PUT',
        requireAuth: true,
      });
      setSession(null);
      setRemainingSeconds(0);
      setIsRunning(false);
      await AsyncStorage.removeItem(STORAGE_KEY);

      // 공부 세션 취소 시 진행 중 알림 정리
      if (session.type === 'study') {
        try {
          await Notifications.dismissAllNotificationsAsync();
        } catch {
          // 무시
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cancelling session:', error);
      showError('세션 취소 중 오류가 발생했습니다.');
    }
  };

  // 세션 취소
  const handleCancelSession = async () => {
    if (!session) return;
    setCancelConfirmVisible(true);
  };

  // 타이머 로직
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            void handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, remainingSeconds]);

  // 백그라운드 처리
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // 포그라운드로 돌아올 때
        const stored = AsyncStorage.getItem(STORAGE_KEY);
        stored.then(value => {
          if (value && isRunning) {
            const data = JSON.parse(value);
            const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
            const newRemaining = Math.max(0, data.duration - elapsed);
            setRemainingSeconds(newRemaining);
            if (newRemaining === 0) {
              setIsRunning(false);
              void handleCompleteSession();
            }
          }
        });
      }
      appStateRef.current = nextAppState;
      backgroundTimeRef.current = Date.now();
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // 초기 로드
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchSettings();
      // 저장된 세션 복원 (포모도로 탭 내부 세션 유지)
      AsyncStorage.getItem(STORAGE_KEY).then(value => {
        if (value) {
          const data = JSON.parse(value) as {
            sessionId?: string;
            startTime: number;
            duration: number;
            type: 'study' | 'break';
            isTest: boolean;
          };
          const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
          const newRemaining = Math.max(0, data.duration - elapsed);
          if (newRemaining > 0) {
            setRemainingSeconds(newRemaining);
            setIsRunning(true);

            // 세션 정보가 있으면 최소한의 세션 객체를 구성해 완료/취소 API와 연동
            if (data.sessionId) {
              const restoredSession: PomodoroSession = {
                id: data.sessionId,
                user_id: user.id,
                type: data.type,
                duration_minutes: data.duration / 60,
                completed_at: null,
                status: 'active',
                created_at: new Date(data.startTime).toISOString(),
                updated_at: new Date().toISOString(),
              };
              setSession(restoredSession);
            }
          } else {
            AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
        setLoading(false);
      });
      void fetchTodayStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간${mins > 0 ? ` ${mins}분` : ''}`;
    }
    return `${mins}분`;
  };

  const formatTodayRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const hasTodayProgress = todayCycleCount > 0 || todayStudyMinutes > 0;

  const getProgress = () => {
    if (!session) return 0;
    const total = session.duration_minutes * 60;
    const progress = (total - remainingSeconds) / total;
    return Math.min(Math.max(progress, 0), 1); // 0과 1 사이로 제한
  };

  const getSessionColor = () => {
    if (!session) return colors.blue500;
    return session.type === 'study' ? pomodoroColors.study : pomodoroColors.break;
  };

  if (loading) {
    return <BlockingLoader visible={true} message='타이머를 불러오는 중...' />;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? Colors.dark.background : colors.background },
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
        <Text style={[styles.title, { color: isDark ? colors.white : colors.textPrimary }]}>
          포모도로 타이머
        </Text>
      </View>

      <View
        style={[
          styles.dailyStatsContainer,
          {
            backgroundColor: isDark ? colors.gray800 : colors.white,
            borderBottomColor: isDark ? colors.gray700 : colors.gray200,
          },
        ]}
      >
        <View style={styles.dailyStatsHeader}>
          <Text
            style={[
              styles.dailyStatsRange,
              { color: isDark ? colors.gray300 : colors.textSecondary },
            ]}
          >
            {formatTodayRange()}
          </Text>
        </View>
        {(todayStatsLoading || hasTodayProgress) && (
          <View style={styles.dailyStatsRow}>
            <View
              style={[
                styles.dailyStatBox,
                { backgroundColor: isDark ? colors.gray900 : colors.gray100 },
              ]}
            >
              <Text
                style={[
                  styles.dailyStatLabel,
                  { color: isDark ? colors.gray300 : colors.textSecondary },
                ]}
              >
                완료 세트
              </Text>
              <Text
                style={[
                  styles.dailyStatValue,
                  { color: isDark ? colors.white : colors.textPrimary },
                ]}
              >
                {todayStatsLoading ? '-' : `${todayCycleCount}회`}
              </Text>
            </View>
            <View
              style={[
                styles.dailyStatBox,
                { backgroundColor: isDark ? colors.gray900 : colors.gray100 },
              ]}
            >
              <Text
                style={[
                  styles.dailyStatLabel,
                  { color: isDark ? colors.gray300 : colors.textSecondary },
                ]}
              >
                공부 시간
              </Text>
              <Text
                style={[
                  styles.dailyStatValue,
                  { color: isDark ? colors.white : colors.textPrimary },
                ]}
              >
                {todayStatsLoading ? '-' : formatMinutes(todayStudyMinutes)}
              </Text>
            </View>
          </View>
        )}
        {/* 공부/휴식 시간 설정 (상단에서 바로 적용) */}
        <View style={styles.settingsRow}>
          <View style={styles.settingsItem}>
            <MinutePicker
              label='공부 시간'
              value={settings.study_duration}
              onChange={minutes => setSettings(prev => ({ ...prev, study_duration: minutes }))}
              minimumValue={1}
              maximumValue={1440}
            />
          </View>
          <View style={styles.settingsItem}>
            <MinutePicker
              label='휴식 시간'
              value={settings.break_duration}
              onChange={minutes => setSettings(prev => ({ ...prev, break_duration: minutes }))}
              minimumValue={1}
              maximumValue={1440}
            />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {session ? (
          <>
            <View style={styles.timerContainer}>
              <View style={styles.timerWrapper}>
                <CircularProgress
                  progress={getProgress()}
                  size={280}
                  strokeWidth={12}
                  color={getSessionColor()}
                  backgroundColor={isDark ? colors.gray700 : colors.gray200}
                  animated={true}
                />
                <View style={styles.timerContent}>
                  <Text style={[styles.timerText, { color: getSessionColor() }]}>
                    {formatTime(remainingSeconds)}
                  </Text>
                  <Text
                    style={[
                      styles.sessionType,
                      { color: isDark ? colors.gray300 : colors.textSecondary },
                    ]}
                  >
                    {session.type === 'study' ? '공부' : '휴식'}
                  </Text>
                </View>
              </View>
              {/* 완료 애니메이션 */}
              {showCompletionAnimation && (
                <View style={styles.completionAnimationContainer}>
                  <CheckmarkAnimation
                    visible={showCompletionAnimation}
                    size={100}
                    color={getSessionColor()}
                    onAnimationComplete={() => {
                      setShowCompletionAnimation(false);
                    }}
                  />
                </View>
              )}
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.primaryButton,
                  { backgroundColor: getSessionColor() },
                ]}
                onPress={() => setIsRunning(!isRunning)}
              >
                <Text style={styles.controlButtonText}>{isRunning ? '일시정지' : '재개'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.secondaryButton,
                  { backgroundColor: isDark ? colors.gray700 : colors.gray300 },
                ]}
                onPress={handleCancelSession}
              >
                <Text style={styles.controlButtonText}>중지</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.startContainer}>
            <Text
              style={[styles.startTitle, { color: isDark ? colors.white : colors.textPrimary }]}
            >
              세션 시작하기
            </Text>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: pomodoroColors.study }]}
              onPress={() => handleStartSession('study')}
            >
              <Text style={styles.startButtonText}>공부 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: pomodoroColors.break }]}
              onPress={() => handleStartSession('break')}
            >
              <Text style={styles.startButtonText}>휴식 시작</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 세션 취소 확인 모달 */}
      <AppModal
        visible={cancelConfirmVisible}
        onRequestClose={() => setCancelConfirmVisible(false)}
        title='세션 취소'
        subtitle='정말 세션을 취소하시겠습니까?'
        animationType='fade'
        type='confirmCancel'
        confirmText='예'
        cancelText='아니오'
        confirmVariant='danger'
        onConfirm={async () => {
          setCancelConfirmVisible(false);
          await performCancelSession();
        }}
        onCancel={() => setCancelConfirmVisible(false)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  timerWrapper: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  sessionType: {
    fontSize: 16,
    marginTop: 8,
  },
  completionAnimationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    width: 100,
    height: 100,
    zIndex: 1000,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButton: {},
  secondaryButton: {
    // backgroundColor는 동적으로 설정
  },
  controlButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  startContainer: {
    alignItems: 'center',
    gap: 16,
  },
  startTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  startButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    paddingHorizontal: 48,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsContent: {
    padding: 16,
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.blue500,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  dailyStatsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  dailyStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  dailyStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dailyStatsRange: {
    fontSize: 12,
  },
  dailyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailyStatBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  dailyStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dailyStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  settingsItem: {
    flex: 1,
  },
});

export default PomodoroScreen;
