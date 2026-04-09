import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Socket } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { connectSocket, disconnectSocket } from '@/utils/socketClient';
import { clientToServerEvents, serverToClientEvents } from '@/constants/socket';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl, getGroupUrl } from '@/config/api';
import { StudyGroup } from '@/types/group';
import { apiFetch } from '@/utils/apiClient';
import RankingChip from '@/components/RankingChip';
import CheckInButton from '@/components/CheckInButton';
import MinutePicker from '@/components/MinutePicker';
import { RankingEntry } from '@/types/group';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors, getThemeColors } from '@/constants/colors';
import { PomodoroSession, PomodoroSettings } from '@/types/pomodoro';
import { useTheme } from '@/contexts/ThemeContext';
import AppModal from '@/components/AppModal';

interface Message {
  id: string;
  text: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
  type?: 'message' | 'system';
}

const STORAGE_KEY = 'pomodoro_session';

const ChatRoomScreen = () => {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editChatEnabled, setEditChatEnabled] = useState<boolean | null>(null);
  const [editCheckInInterval, setEditCheckInInterval] = useState<number | null>(null);
  const [savingGroupSettings, setSavingGroupSettings] = useState(false);
  const [groupSettingsSavedModalVisible, setGroupSettingsSavedModalVisible] = useState(false);
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

  // Stack 네비게이션 헤더 숨기기
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStudyActive, setIsStudyActive] = useState(false);
  const [currentSessionType, setCurrentSessionType] = useState<'study' | 'break'>('study');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [checkInTimeRemaining, setCheckInTimeRemaining] = useState(30);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [checkInInterval, setCheckInInterval] = useState(30);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings | null>(null);
  const [pomodoroSessionId, setPomodoroSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<PomodoroSettings>({
    study_duration: 25,
    break_duration: 5,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [isRankingCollapsed, setIsRankingCollapsed] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const currentGroupIdRef = useRef<string | null>(null);
  const eventHandlersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const isOwner = group && user ? group.owner_id === user.id : false;

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

  const handleOpenGroupEdit = useCallback(() => {
    if (!group) return;
    setEditGroupName(group.name);
    setEditGroupDescription(group.description ?? '');
    setEditChatEnabled(group.chat_enabled);
    setEditCheckInInterval(group.check_in_interval);
    setEditingGroup(true);
  }, [group]);

  const handleSaveGroupEdit = useCallback(async () => {
    if (!group || editChatEnabled === null || editCheckInInterval === null) return;

    const trimmedName = editGroupName.trim();
    if (!trimmedName) {
      showError('그룹명을 입력해주세요.');
      return;
    }

    try {
      setSavingGroupSettings(true);

      const updateInfo = await apiFetch<{
        success?: boolean;
        message?: string;
        data?: { group: StudyGroup };
      }>(getGroupUrl('UPDATE', group.id), {
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

      const settingsResult = await apiFetch<{
        success?: boolean;
        message?: string;
        data?: { group: StudyGroup };
      }>(getGroupUrl('SETTINGS', group.id), {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify({
          chat_enabled: editChatEnabled,
          check_in_interval: editCheckInInterval,
        }),
      });

      if (!settingsResult?.success) {
        showError(settingsResult?.message ?? '그룹 설정 저장 중 오류가 발생했습니다.');
        return;
      }

      const updatedGroup = settingsResult.data?.group ?? updateInfo.data?.group;
      if (updatedGroup) {
        setGroup(updatedGroup);
        setCheckInInterval(updatedGroup.check_in_interval);
      }

      setEditingGroup(false);
      setGroupSettingsSavedModalVisible(true);
    } catch (e) {
      showError((e as Error).message ?? '그룹 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingGroupSettings(false);
    }
  }, [group, editChatEnabled, editCheckInInterval, editGroupName, editGroupDescription]);

  // 그룹 정보 조회
  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      try {
        const data = await apiFetch<{ data?: { group?: StudyGroup } }>(
          getGroupUrl('DETAIL', groupId),
          {
            method: 'GET',
            requireAuth: true,
          },
        );
        if (data.data?.group) {
          const g = data.data.group;
          setGroup(g);
          setCheckInInterval(g.check_in_interval);
          setEditGroupName(g.name);
          setEditGroupDescription(g.description ?? '');
          setEditChatEnabled(g.chat_enabled);
          setEditCheckInInterval(g.check_in_interval);
        }
      } catch {
        showError('그룹 정보를 불러올 수 없습니다.');
        router.back();
      }
    };

    fetchGroup();
  }, [groupId, router]);

  // 포모도로 설정 조회 (채팅방 타이머에 활용)
  useEffect(() => {
    if (!user) return;

    const fetchPomodoroSettings = async () => {
      try {
        const data = await apiFetch<{ data?: { settings?: PomodoroSettings } }>(
          getApiUrl('/api/pomodoro/settings'),
          {
            method: 'GET',
            requireAuth: true,
            // 채팅 입장 시 설정 조회 실패는 조용히 무시
            showAuthErrorAlert: false,
          },
        );

        if (data.data?.settings) {
          setPomodoroSettings(data.data.settings);
          setTempSettings(data.data.settings);
        }
      } catch {
        // 설정 조회 실패 시 기본 체크인 간격으로만 동작
      }
    };

    void fetchPomodoroSettings();
  }, [user]);

  // 설정 모달 애니메이션
  useEffect(() => {
    if (showSettings) {
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      modalOpacity.setValue(0);
    }
  }, [showSettings, modalOpacity]);

  // Socket.IO 연결
  useEffect(() => {
    if (!groupId || !user) return;

    let joinedTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const initSocket = async () => {
      try {
        setIsLoadingMessages(true);
        const socketInstance = await connectSocket();
        socketRef.current = socketInstance;
        setSocket(socketInstance);

        // 기존 이벤트 리스너 제거
        eventHandlersRef.current.forEach((handler, event) => {
          socketInstance.off(event as any, handler);
        });
        eventHandlersRef.current.clear();

        // 메시지 수신 핸들러
        const handleMessage = (message: Message) => {
          if (!isMounted) return;
          setMessages(prev => {
            const newMessages = [...prev, message];
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return newMessages;
          });
        };

        // 시스템 메시지 수신 핸들러
        const handleSystem = (systemMsg: {
          kind: 'join' | 'leave';
          userId: string;
          displayName?: string;
          avatar?: string;
          roomId: string;
        }) => {
          if (!isMounted) return;
          setMessages(prev => [
            ...prev,
            {
              id: `system-${Date.now()}`,
              text: `${systemMsg.displayName || '사용자'}님이 ${
                systemMsg.kind === 'join' ? '입장' : '퇴장'
              }했습니다.`,
              userId: systemMsg.userId,
              displayName: systemMsg.displayName,
              avatar: systemMsg.avatar,
              createdAt: new Date().toISOString(),
              type: 'system',
            },
          ]);
        };

        // 공부 세션 이벤트 핸들러
        const handleCheckInRequest = (payload: {
          groupId: string;
          checkInInterval: number;
          activeSessions: string[];
        }) => {
          if (!isMounted) return;
          setCheckInVisible(true);
          setCheckInTimeRemaining(payload.checkInInterval * 60);
        };

        const handleCheckInComplete = () => {
          if (!isMounted) return;
          setCheckInVisible(false);
        };

        const handleRankingUpdate = (payload: { groupId: string; ranking: RankingEntry[] }) => {
          if (!isMounted) return;
          setRanking(payload.ranking);
        };

        const handleTimeUpdate = (payload: {
          groupId: string;
          userId: string;
          totalMinutes: number;
        }) => {
          if (!isMounted || payload.userId !== user.id) return;
          setTodayMinutes(payload.totalMinutes);
        };

        // 입장 완료 이벤트 핸들러
        const handleJoined = (payload: {
          roomId: string;
          userId: string;
          displayName: string;
          avatar: string;
          history: Message[];
        }) => {
          if (!isMounted || payload.roomId !== groupId) return;
          if (joinedTimeout) {
            clearTimeout(joinedTimeout);
            joinedTimeout = null;
          }
          setMessages(payload.history || []);
          setIsLoadingMessages(false);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        };

        // 에러 핸들러
        const handleError = (payload: { message: string }) => {
          if (!isMounted) return;
          console.error('Socket error:', payload.message);
          if (joinedTimeout) {
            clearTimeout(joinedTimeout);
            joinedTimeout = null;
          }
          setIsLoadingMessages(false);
        };

        // 이벤트 리스너 등록
        socketInstance.on(serverToClientEvents.message, handleMessage);
        socketInstance.on(serverToClientEvents.system, handleSystem);
        socketInstance.on(serverToClientEvents.studyCheckInRequest, handleCheckInRequest);
        socketInstance.on(serverToClientEvents.studyCheckInComplete, handleCheckInComplete);
        socketInstance.on(serverToClientEvents.studyRankingUpdate, handleRankingUpdate);
        socketInstance.on(serverToClientEvents.studyTimeUpdate, handleTimeUpdate);
        socketInstance.on(serverToClientEvents.joined, handleJoined);
        socketInstance.on(serverToClientEvents.error, handleError);

        // 핸들러 저장 (cleanup용)
        eventHandlersRef.current.set(serverToClientEvents.message, handleMessage);
        eventHandlersRef.current.set(serverToClientEvents.system, handleSystem);
        eventHandlersRef.current.set(
          serverToClientEvents.studyCheckInRequest,
          handleCheckInRequest,
        );
        eventHandlersRef.current.set(
          serverToClientEvents.studyCheckInComplete,
          handleCheckInComplete,
        );
        eventHandlersRef.current.set(serverToClientEvents.studyRankingUpdate, handleRankingUpdate);
        eventHandlersRef.current.set(serverToClientEvents.studyTimeUpdate, handleTimeUpdate);
        eventHandlersRef.current.set(serverToClientEvents.joined, handleJoined);
        eventHandlersRef.current.set(serverToClientEvents.error, handleError);

        // 같은 그룹이 아니면 재입장
        if (currentGroupIdRef.current !== groupId) {
          currentGroupIdRef.current = groupId;
          socketInstance.emit(clientToServerEvents.join, groupId);

          // 타임아웃 설정 (5초 내 joined 이벤트가 오지 않으면 로딩 해제)
          joinedTimeout = setTimeout(() => {
            if (isMounted) {
              console.warn('Joined event timeout, clearing loading state');
              setIsLoadingMessages(false);
            }
          }, 5000);
        } else {
          // 같은 그룹이면 로딩 해제 (이미 입장한 상태)
          setIsLoadingMessages(false);
        }

        // 공부 상태 조회
        socketInstance.emit(clientToServerEvents.studyStatus, { groupId });
      } catch (error) {
        console.error('Socket connection error:', error);
        if (isMounted) {
          showError('채팅방 연결에 실패했습니다.');
          setIsLoadingMessages(false);
        }
      }
    };

    initSocket().catch(error => {
      console.error('Failed to initialize socket:', error);
      if (isMounted) {
        showError('채팅방 연결에 실패했습니다.');
        setIsLoadingMessages(false);
      }
    });

    return () => {
      isMounted = false;
      if (joinedTimeout) {
        clearTimeout(joinedTimeout);
      }

      const currentSocket = socketRef.current;
      if (currentSocket && currentGroupIdRef.current === groupId) {
        // 이벤트 리스너 제거
        eventHandlersRef.current.forEach((handler, event) => {
          currentSocket.off(event as any, handler);
        });
        eventHandlersRef.current.clear();

        // 그룹에서 나가기
        currentSocket.emit(clientToServerEvents.leave, groupId);
        currentGroupIdRef.current = null;
      }
    };
  }, [groupId, user]);

  // 타이머 업데이트 (포모도로 설정 기반)
  useEffect(() => {
    if (!isStudyActive || !pomodoroSettings) {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      return;
    }

    const duration =
      currentSessionType === 'study'
        ? pomodoroSettings.study_duration
        : pomodoroSettings.break_duration;

    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const newValue = prev + 1;
        if (newValue >= duration * 60) {
          // 세션 완료 - 자동 전환
          const nextType = currentSessionType === 'study' ? 'break' : 'study';
          setCurrentSessionType(nextType);
          setElapsedSeconds(0);
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [isStudyActive, currentSessionType, pomodoroSettings]);

  // 체크인 타이머
  useEffect(() => {
    if (checkInVisible && checkInTimeRemaining > 0) {
      const timer = setInterval(() => {
        setCheckInTimeRemaining(prev => {
          if (prev <= 1) {
            setCheckInVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [checkInVisible, checkInTimeRemaining]);

  // 메시지 전송
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !socket || !groupId || !group?.chat_enabled) return;

    socket.emit(clientToServerEvents.message, {
      roomId: groupId,
      text: inputText.trim(),
    });

    setInputText('');
  }, [inputText, socket, groupId, group]);

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '방금';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;

    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 날짜 구분선 표시 여부 확인
  const shouldShowDateSeparator = (current: Message, previous: Message | undefined) => {
    if (!previous) return true;
    const currentDate = new Date(current.createdAt).toDateString();
    const previousDate = new Date(previous.createdAt).toDateString();
    return currentDate !== previousDate;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return '오늘';
    if (date.toDateString() === yesterday.toDateString()) return '어제';
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  const formatTodayMinutes = (total: number) => {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const effectiveTimerDuration = pomodoroSettings?.study_duration ?? checkInInterval;

  // 포모도로 설정 저장
  const handleSaveSettings = useCallback(async () => {
    try {
      setSavingSettings(true);
      await apiFetch(getApiUrl('/api/pomodoro/settings'), {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify(tempSettings),
      });
      setPomodoroSettings(tempSettings);
      setShowSettings(false);
      showInfo('완료', '설정이 저장되었습니다.');
    } catch (e) {
      showError((e as Error).message ?? '설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingSettings(false);
    }
  }, [tempSettings]);

  // 타이머 포맷팅 (남은 시간 또는 카운트다운)
  const formatTimerDisplay = () => {
    if (!pomodoroSettings) return '대기 중';

    const duration =
      currentSessionType === 'study'
        ? pomodoroSettings.study_duration
        : pomodoroSettings.break_duration;
    const totalSeconds = duration * 60;
    const remaining = totalSeconds - elapsedSeconds;

    // 30초 이하 남았을 때 카운트다운 표시
    if (remaining <= 30 && remaining > 0) {
      return `다음 ${currentSessionType === 'study' ? '휴식' : '공부'}까지 ${remaining}초`;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${currentSessionType === 'study' ? '공부' : '휴식'} ${String(mins).padStart(
      2,
      '0',
    )}:${String(secs).padStart(2, '0')}`;
  };

  // 타이머 색상
  const getTimerColor = () => {
    if (!isStudyActive) return colors.textSecondary;
    return currentSessionType === 'study' ? colors.blue500 : colors.green500;
  };

  // 동일 userId가 중복으로 들어오는 경우를 방지하기 위해
  // userId 기준으로 한 번만 남기도록 클라이언트에서 한 번 더 필터링
  const uniqueRanking = useMemo(
    () =>
      ranking.filter(
        (entry, index, arr) => arr.findIndex(e => e.userId === entry.userId) === index,
      ),
    [ranking],
  );

  // 서버에서 랭킹 정보가 오지 않더라도,
  // 최소한 내 랭킹칩은 표시되도록 fallback 랭킹 생성
  const derivedRanking = useMemo(() => {
    if (!user) return uniqueRanking;
    if (uniqueRanking.length > 0) return uniqueRanking;

    const baseName = user.nickname ?? user.email?.split('@')[0] ?? '나';
    const displayName = baseName.length > 8 ? baseName.slice(0, 8) : baseName;
    const avatarText = user.avatar ?? displayName.charAt(0).toUpperCase();

    const selfEntry: RankingEntry = {
      userId: user.id,
      displayName,
      avatar: avatarText,
      totalMinutes: todayMinutes,
      rank: 1,
    };

    return [selfEntry];
  }, [uniqueRanking, user, todayMinutes]);

  // 내 카드칩과 다른 참여자 분리
  const myRankingEntry = useMemo(() => {
    if (!user) return null;
    return derivedRanking.find(entry => entry.userId === user.id) || null;
  }, [derivedRanking, user]);

  const otherRankingEntries = useMemo(() => {
    if (!user) return derivedRanking;
    return derivedRanking.filter(entry => entry.userId !== user.id);
  }, [derivedRanking, user]);

  // 현재 세션 진행률 (버튼 내부 왼쪽 -> 오른쪽 채움)
  const sessionProgress = useMemo(() => {
    if (!pomodoroSettings || !isStudyActive) return 0;
    const durationMinutes =
      currentSessionType === 'study'
        ? pomodoroSettings.study_duration
        : pomodoroSettings.break_duration;
    const totalSeconds = Math.max(durationMinutes * 60, 1);
    return Math.max(0, Math.min(elapsedSeconds / totalSeconds, 1));
  }, [pomodoroSettings, isStudyActive, currentSessionType, elapsedSeconds]);

  // 버튼 채움 색: 진행률에 따라 공부(파랑) -> 휴식(초록) -> 공부(파랑) 그라데이션
  const progressFillColor = useMemo(() => {
    const lerp = (start: number, end: number, t: number) => Math.round(start + (end - start) * t);
    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    const blue = { r: 59, g: 130, b: 246 }; // #3B82F6
    const green = { r: 16, g: 185, b: 129 }; // #10B981

    const p = clamp(sessionProgress);
    if (p <= 0.5) {
      const t = p / 0.5;
      return `rgb(${lerp(blue.r, green.r, t)}, ${lerp(blue.g, green.g, t)}, ${lerp(blue.b, green.b, t)})`;
    }

    const t = (p - 0.5) / 0.5;
    return `rgb(${lerp(green.r, blue.r, t)}, ${lerp(green.g, blue.g, t)}, ${lerp(green.b, blue.b, t)})`;
  }, [sessionProgress]);

  // 공부 시작
  const handleStartStudy = useCallback(async () => {
    if (!socket || !groupId || !user) return;

    try {
      // 포모도로 세션도 함께 생성하여 통계/포모도로 탭과 공유
      const duration = effectiveTimerDuration;
      const data = await apiFetch<{ data?: { session?: PomodoroSession } }>(
        getApiUrl('/api/pomodoro/sessions'),
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            type: 'study',
            duration_minutes: duration,
          }),
        },
      );

      const newSession = data.data?.session;
      if (newSession) {
        setPomodoroSessionId(newSession.id);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            sessionId: newSession.id,
            startTime: Date.now(),
            duration: duration * 60,
            type: 'study',
            isTest: false,
          }),
        );
      }
    } catch (e) {
      // 세션 생성 실패는 채팅방 공부 흐름을 막지 않음
      // eslint-disable-next-line no-console
      console.error('Error starting shared pomodoro session from group chat:', e);
    }

    // 그룹 공부 시작 소켓 이벤트
    socket.emit(clientToServerEvents.studyStart, { groupId });
    setIsStudyActive(true);
    setCurrentSessionType('study');
    setElapsedSeconds(0);

    // 로컬 알림으로 공부 상태 표시
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '공부 집중 중',
          body: group
            ? `${group.name} 그룹에서 공부 중입니다.`
            : '딥웰스터디 세션이 진행 중입니다.',
        },
        trigger: null,
      });
    } catch {
      // 알림 실패는 무시
    }
  }, [socket, groupId, user, effectiveTimerDuration, group]);

  // 공부 종료
  const handleStopStudy = useCallback(async () => {
    if (!socket || !groupId || !user) return;

    // 그룹 공부 종료 소켓 이벤트
    socket.emit(clientToServerEvents.studyStop, { groupId });
    setIsStudyActive(false);
    setElapsedSeconds(0);
    setCurrentSessionType('study');

    // 포모도로 세션 완료 처리
    if (pomodoroSessionId) {
      try {
        await apiFetch(getApiUrl(`/api/pomodoro/sessions/${pomodoroSessionId}/complete`), {
          method: 'PUT',
          requireAuth: true,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error completing shared pomodoro session from group chat:', e);
      } finally {
        setPomodoroSessionId(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    }

    // 진행 중인 알림 정리
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // 무시
    }

    // 공부 종료 후 통계 다시 조회 (서버에서 time update가 늦게 올 수 있으므로)
    setTimeout(() => {
      if (socket && groupId) {
        socket.emit(clientToServerEvents.studyStatus, { groupId });
      }
    }, 500);
  }, [socket, groupId, pomodoroSessionId, user]);

  // 체크인 버튼 클릭
  const handleCheckIn = useCallback(() => {
    if (!socket || !groupId) return;

    // 활성 세션 ID는 서버에서 처리하므로 임시로 빈 문자열 전송
    socket.emit(clientToServerEvents.studyCheckInSubmit, {
      groupId,
      sessionId: '', // 서버에서 활성 세션을 찾아서 처리
    });
  }, [socket, groupId]);

  // 방장이 체크인 요청
  const handleRequestCheckIn = useCallback(() => {
    if (!socket || !groupId || !user || group?.owner_id !== user.id) return;

    socket.emit(clientToServerEvents.studyCheckInRequest, { groupId });
  }, [socket, groupId, user, group]);

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.blue500} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 그룹 편집 모달 (중앙 알림 모달 규격) */}
      <AppModal
        visible={editingGroup}
        onRequestClose={() => {
          if (savingGroupSettings) return;
          setEditingGroup(false);
        }}
        title='그룹 설정'
        subtitle={group?.name}
        animationType='fade'
        type='confirmCancel'
        confirmText='저장'
        cancelText='취소'
        onConfirm={handleSaveGroupEdit}
        onCancel={() => {
          if (savingGroupSettings) return;
          setEditingGroup(false);
        }}
        confirmDisabled={
          savingGroupSettings ||
          editChatEnabled === null ||
          editCheckInInterval === null ||
          !editGroupName.trim()
        }
        content={
          <View style={styles.groupSettingsSection}>
            <View style={[styles.groupSettingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.groupSettingLabel, { color: themeColors.textPrimary }]}>
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

            <View style={[styles.groupSettingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.groupSettingLabel, { color: themeColors.textPrimary }]}>
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

            <View style={[styles.groupSettingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.groupSettingLabel, { color: themeColors.textPrimary }]}>
                채팅 허용
              </Text>
              <Switch
                value={editChatEnabled ?? false}
                onValueChange={setEditChatEnabled}
                trackColor={{ false: themeColors.borderSecondary, true: colors.blue500 }}
                thumbColor='#FFFFFF'
              />
            </View>
            <View style={[styles.groupSettingRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.groupSettingLabel, { color: themeColors.textPrimary }]}>
                체크인 간격 (분)
              </Text>
              <TextInput
                style={[
                  styles.groupIntervalInput,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                value={editCheckInInterval?.toString() ?? ''}
                onChangeText={text => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num > 0) setEditCheckInInterval(num);
                  else if (text === '') setEditCheckInInterval(null);
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
        visible={groupSettingsSavedModalVisible}
        onRequestClose={() => setGroupSettingsSavedModalVisible(false)}
        title='저장되었습니다.'
        subtitle='그룹 정보가 저장되었습니다.'
        animationType='fade'
        type='confirm'
        confirmText='확인'
        onConfirm={() => setGroupSettingsSavedModalVisible(false)}
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

      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.background,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name='arrow-back' size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {group.name}
          </Text>
          {group.description ? (
            <Text
              style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}
              numberOfLines={1}
            >
              {group.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {isOwner && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleOpenGroupEdit}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name='edit' size={22} color={themeColors.textPrimary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name='settings' size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 랭킹 영역 (내 카드칩 + 다른 참여자) */}
        {isRankingCollapsed ? (
          <TouchableOpacity
            style={[
              styles.collapsedRankingContainer,
              {
                backgroundColor: themeColors.cardBackground,
                borderBottomColor: themeColors.border,
              },
            ]}
            onPress={() => setIsRankingCollapsed(false)}
          >
            <View style={styles.collapsedInfo}>
              <Text style={[styles.collapsedTime, { color: themeColors.textPrimary }]}>
                {formatTodayMinutes(todayMinutes)}
              </Text>
              <Text style={[styles.collapsedTimer, { color: getTimerColor() }]} numberOfLines={1}>
                {isStudyActive ? formatTimerDisplay() : '대기 중'}
              </Text>
            </View>
            <IconSymbol name='arrow-drop-up' size={25} color={themeColors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.rankingSection,
              {
                backgroundColor: themeColors.background,
                borderBottomColor: themeColors.border,
              },
            ]}
          >
            {/* 내 카드칩 */}
            {myRankingEntry && (
              <View style={styles.myChipContainer}>
                <TouchableOpacity
                  style={styles.collapseButton}
                  onPress={() => setIsRankingCollapsed(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol name={'arrow-drop-down'} size={25} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.myChipWrapper}>
                  {/* 내 카드칩 */}
                  <View style={styles.myChipInner}>
                    <RankingChip
                      rank={myRankingEntry.rank}
                      displayName={myRankingEntry.displayName}
                      avatar={myRankingEntry.avatar}
                      // 내 칩은 todayMinutes 기준으로 실시간 업데이트
                      totalMinutes={todayMinutes}
                      isActive={isStudyActive}
                      showRankBadge={myRankingEntry.rank > 0 && myRankingEntry.rank <= 5}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 다른 참여자들 (수평 스크롤) */}
            {otherRankingEntries.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.otherRankingContainer}
                contentContainerStyle={styles.otherRankingContent}
              >
                {otherRankingEntries.map(entry => (
                  <RankingChip
                    key={entry.userId}
                    rank={entry.rank}
                    displayName={entry.displayName}
                    avatar={entry.avatar}
                    totalMinutes={entry.totalMinutes}
                    isActive={isStudyActive && entry.rank > 0 && entry.rank <= 3}
                    showRankBadge={entry.rank > 0 && entry.rank <= 5}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* 채팅 영역 */}
        {group.chat_enabled ? (
          <View style={styles.chatArea}>
            {isLoadingMessages ? (
              <View style={styles.messagesLoadingContainer}>
                <ActivityIndicator size='small' color={colors.blue500} />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <IconSymbol name='chat-bubble-outline' size={48} color={colors.gray400} />
                <Text style={styles.emptyMessagesText}>아직 메시지가 없습니다</Text>
                <Text style={styles.emptyMessagesSubtext}>첫 메시지를 보내보세요!</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesListContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item, index }) => {
                  const isMyMessage = item.userId === user?.id;
                  const previousMessage = index > 0 ? messages[index - 1] : undefined;
                  const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
                  const showAvatar =
                    !isMyMessage &&
                    (index === 0 ||
                      previousMessage?.userId !== item.userId ||
                      previousMessage?.type === 'system');

                  return (
                    <View>
                      {showDateSeparator && (
                        <View style={styles.dateSeparator}>
                          <Text style={styles.dateSeparatorText}>{formatDate(item.createdAt)}</Text>
                        </View>
                      )}
                      {item.type === 'system' ? (
                        <View style={styles.systemMessageContainer}>
                          <Text style={styles.systemMessage}>{item.text}</Text>
                        </View>
                      ) : (
                        <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
                          {!isMyMessage && (
                            <View style={styles.avatarContainer}>
                              {showAvatar ? (
                                <View style={styles.avatar}>
                                  <Text style={styles.avatarText}>
                                    {item.avatar || item.displayName?.[0] || '👤'}
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.avatarSpacer} />
                              )}
                            </View>
                          )}
                          <View
                            style={[
                              styles.messageBubble,
                              isMyMessage
                                ? styles.myMessageBubble
                                : [
                                    styles.otherMessageBubble,
                                    {
                                      backgroundColor: themeColors.cardBackground,
                                      borderColor: themeColors.border,
                                    },
                                  ],
                            ]}
                          >
                            {!isMyMessage && (
                              <Text
                                style={[styles.messageSender, { color: themeColors.textSecondary }]}
                              >
                                {item.displayName || '알 수 없음'}
                              </Text>
                            )}
                            <Text
                              style={[
                                styles.messageText,
                                isMyMessage
                                  ? styles.myMessageText
                                  : { color: themeColors.textPrimary },
                              ]}
                            >
                              {item.text}
                            </Text>
                            <Text
                              style={[
                                styles.messageTime,
                                isMyMessage
                                  ? styles.myMessageTime
                                  : { color: themeColors.textTertiary },
                              ]}
                            >
                              {formatTime(item.createdAt)}
                            </Text>
                          </View>
                          {isMyMessage && <View style={styles.avatarSpacer} />}
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}

            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: themeColors.background,
                  borderTopColor: themeColors.border,
                },
              ]}
            >
              <View style={[styles.inputWrapper, { backgroundColor: themeColors.surface }]}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeColors.textPrimary,
                    },
                  ]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder='메시지를 입력하세요...'
                  placeholderTextColor={themeColors.textTertiary}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim()}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    name='send'
                    size={20}
                    color={inputText.trim() ? colors.white : colors.gray400}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.disabledContainer}>
            <IconSymbol name='chat-bubble-outline' size={64} color={colors.gray400} />
            <Text style={[styles.disabledText, { color: themeColors.textSecondary }]}>
              채팅이 비활성화되었습니다
            </Text>
          </View>
        )}

        {/* 공부 시작/종료 버튼 */}
        <View
          style={[
            styles.studyControls,
            {
              backgroundColor: themeColors.background,
              borderTopColor: themeColors.border,
            },
          ]}
        >
          {!isStudyActive ? (
            <TouchableOpacity style={styles.startButton} onPress={handleStartStudy}>
              <Text style={styles.startButtonText}>공부 시작</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={handleStopStudy}>
              <View
                pointerEvents='none'
                style={[
                  styles.studyProgressFill,
                  {
                    width: `${Math.round(sessionProgress * 100)}%`,
                    backgroundColor: progressFillColor,
                  },
                ]}
              />
              <Text style={styles.stopButtonText}>{`${formatTimerDisplay()} · 종료`}</Text>
            </TouchableOpacity>
          )}

          {/* 방장만 체크인 요청 가능 */}
          {group.owner_id === user?.id && (
            <TouchableOpacity style={styles.checkInRequestButton} onPress={handleRequestCheckIn}>
              <Text style={styles.checkInRequestButtonText}>체크인 요청</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 체크인 버튼 */}
        <CheckInButton
          visible={checkInVisible}
          onPress={handleCheckIn}
          timeRemaining={checkInTimeRemaining}
        />
      </KeyboardAvoidingView>

      {/* 포모도로 설정 모달 */}
      <Modal
        transparent
        visible={showSettings}
        animationType='none'
        onRequestClose={() => setShowSettings(false)}
      >
        <Animated.View
          style={[styles.modalBackdrop, { opacity: modalOpacity }]}
          pointerEvents={showSettings ? 'auto' : 'none'}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)} />
          <Pressable
            style={[styles.modalContent, { backgroundColor: themeColors.cardBackground }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                포모도로 설정
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <IconSymbol name='close' size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent}>
              <MinutePicker
                label='공부 시간'
                value={tempSettings.study_duration}
                onChange={minutes => setTempSettings({ ...tempSettings, study_duration: minutes })}
                minimumValue={1}
                maximumValue={1440}
              />

              <MinutePicker
                label='휴식 시간'
                value={tempSettings.break_duration}
                onChange={minutes => setTempSettings({ ...tempSettings, break_duration: minutes })}
                minimumValue={1}
                maximumValue={1440}
              />

              <TouchableOpacity
                style={[styles.saveButton, savingSettings && styles.saveButtonDisabled]}
                onPress={handleSaveSettings}
                disabled={savingSettings}
              >
                <Text style={styles.saveButtonText}>
                  {savingSettings ? '저장 중...' : '설정 저장'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  rankingSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  myChipContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  collapseButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  myChipWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  myChipInner: {
    position: 'absolute',
    zIndex: 1,
  },
  otherRankingContainer: {
    marginTop: 8,
  },
  otherRankingContent: {
    paddingRight: 16,
  },
  collapsedRankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  collapsedInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  collapsedTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapsedTimer: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rankingContainer: {
    maxHeight: 120,
    marginVertical: 8,
  },
  rankingContent: {
    paddingHorizontal: 16,
  },
  chatArea: {
    flex: 1,
  },
  messagesLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: colors.textTertiary,
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  myMessageRow: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 36,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue500,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  avatarSpacer: {
    width: 36,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  myMessageBubble: {
    backgroundColor: colors.blue500,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: colors.blue100,
  },
  otherMessageTime: {
    color: colors.textTertiary,
  },
  inputContainer: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 72, // 3 lines (20*3) + vertical padding
    minHeight: 34,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  disabledText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  studyControls: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stopButton: {
    flex: 1,
    backgroundColor: colors.red600,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  studyProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 1,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkInRequestButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkInRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  groupSettingsSection: {
    marginBottom: 24,
  },
  groupSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupSettingLabel: {
    fontSize: 16,
    flex: 1,
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
  groupIntervalInput: {
    width: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});

export default ChatRoomScreen;
