/**
 * 공통 상수 정의
 * 도메인에 속하지 않는 공통 상수를 관리합니다.
 *
 * 재사용 가능성: ⭐⭐⭐⭐⭐
 */

/**
 * 애니메이션 지속 시간 (밀리초)
 */
export const animationDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * 디바운스/스로틀 시간 (밀리초)
 */
export const debounceDelay = {
  search: 300,
  input: 500,
  api: 1000,
} as const;

/**
 * 페이지네이션
 */
export const pagination = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/**
 * 날짜 포맷
 */
export const dateFormats = {
  display: 'YYYY-MM-DD',
  displayWithTime: 'YYYY-MM-DD HH:mm',
  displayKorean: 'YYYY년 MM월 DD일',
  api: 'YYYY-MM-DDTHH:mm:ssZ',
} as const;

/**
 * 시간 포맷
 */
export const timeFormats = {
  hoursMinutes: 'H:mm', // 9:12
  hoursMinutesSeconds: 'H:mm:ss', // 9:12:30
  minutesSeconds: 'm:ss', // 12:30
} as const;
