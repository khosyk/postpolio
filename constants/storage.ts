/**
 * AsyncStorage 키 상수 정의
 * 모든 저장소 키를 중앙에서 관리하여 타입 안전성을 보장합니다.
 *
 * 재사용 가능성: ⭐⭐⭐⭐⭐
 * 다른 프로젝트에서도 바로 사용 가능
 */

/**
 * AsyncStorage 키 상수
 * 키 이름은 도메인_목적 형식으로 명명
 */
export const storageKeys = {
  // 인증 관련
  auth: {
    accessToken: '@postpolio/auth/accessToken',
    refreshToken: '@postpolio/auth/refreshToken',
    userId: '@postpolio/auth/userId',
  },

  // 그룹 관련
  group: {
    favorites: '@postpolio/group/favorites',
    lastSelectedGroupId: '@postpolio/group/lastSelectedGroupId',
  },

  // 포모도로 관련
  pomodoro: {
    settings: '@postpolio/pomodoro/settings',
    currentSession: '@postpolio/pomodoro/currentSession',
    sessionHistory: '@postpolio/pomodoro/sessionHistory',
  },

  // 성적표 관련
  grade: {
    lastViewedDate: '@postpolio/grade/lastViewedDate',
  },

  // 설정 관련
  settings: {
    theme: '@postpolio/settings/theme',
    notifications: '@postpolio/settings/notifications',
    language: '@postpolio/settings/language',
  },
} as const;

/**
 * 타입 안전한 저장소 키 타입
 */
export type StorageKey =
  | (typeof storageKeys.auth)[keyof typeof storageKeys.auth]
  | (typeof storageKeys.group)[keyof typeof storageKeys.group]
  | (typeof storageKeys.pomodoro)[keyof typeof storageKeys.pomodoro]
  | (typeof storageKeys.grade)[keyof typeof storageKeys.grade]
  | (typeof storageKeys.settings)[keyof typeof storageKeys.settings];
