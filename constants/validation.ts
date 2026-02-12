/**
 * 유효성 검사 규칙 상수 정의
 * 입력값 검증에 사용하는 규칙을 중앙에서 관리합니다.
 *
 * 재사용 가능성: ⭐⭐⭐⭐⭐
 * 다른 프로젝트에서도 바로 사용 가능
 */

/**
 * 입력값 길이 제한
 */
export const inputLimits = {
  // 그룹 관련
  groupName: {
    min: 1,
    max: 50,
  },
  groupDescription: {
    min: 0,
    max: 200,
  },

  // 사용자 관련
  displayName: {
    min: 1,
    max: 20,
  },
  email: {
    min: 5,
    max: 100,
  },
  password: {
    min: 8,
    max: 100,
  },

  // 성적표 관련
  subjectName: {
    min: 1,
    max: 30,
  },
  examName: {
    min: 1,
    max: 50,
  },
} as const;

/**
 * 점수 범위
 */
export const scoreRange = {
  min: 0,
  max: 100,
} as const;

/**
 * 시간 범위 (분 단위)
 */
export const timeRange = {
  pomodoroStudy: {
    min: 1,
    max: 120,
    default: 25,
  },
  pomodoroBreak: {
    min: 1,
    max: 60,
    default: 5,
  },
  pomodoroLongBreak: {
    min: 1,
    max: 60,
    default: 15,
  },
  checkInInterval: {
    min: 5,
    max: 120,
    default: 30,
  },
  sessionsUntilLongBreak: {
    min: 1,
    max: 10,
    default: 4,
  },
} as const;

/**
 * 정규식 패턴
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // 비밀번호: 최소 8자, 영문, 숫자, 특수문자 포함
  password: /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;
