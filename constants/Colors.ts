/**
 * 색상 상수 정의
 * 앱 전체에서 사용하는 색상 팔레트를 중앙에서 관리합니다.
 *
 * 재사용 가능성: ⭐⭐⭐⭐⭐
 * 다른 프로젝트에서도 바로 사용 가능
 */

export const colors = {
  // 기본 색상
  white: '#FFFFFF',
  black: '#000000',

  // 그레이 스케일
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // 파란색 계열 (주요 액션, 1등)
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6', // rgb(59, 130, 246) - 1등 색상
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',

  // 빨간색 계열 (에러, 5등)
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red200: '#FECACA',
  red300: '#FCA5A5',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626', // rgb(239, 68, 68) - 5등 색상
  red700: '#B91C1C',
  red800: '#991B1B',
  red900: '#7F1D1D',

  // 초록색 계열 (성공, 3등)
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green200: '#BBF7D0',
  green300: '#86EFAC',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A', // 3등 색상
  green700: '#15803D',
  green800: '#166534',
  green900: '#14532D',

  // 노란색 계열 (경고, 4등)
  yellow50: '#FEFCE8',
  yellow100: '#FEF9C3',
  yellow200: '#FEF08A',
  yellow300: '#FDE047',
  yellow400: '#FACC15',
  yellow500: '#EAB308', // 4등 색상
  yellow600: '#CA8A04',
  yellow700: '#A16207',
  yellow800: '#854D0E',
  yellow900: '#713F12',

  // 청록색 계열 (2등)
  cyan50: '#ECFEFF',
  cyan100: '#CFFAFE',
  cyan200: '#A5F3FC',
  cyan300: '#67E8F9',
  cyan400: '#22D3EE',
  cyan500: '#06B6D4', // 2등 색상
  cyan600: '#0891B2',
  cyan700: '#0E7490',
  cyan800: '#155E75',
  cyan900: '#164E63',

  // 배경 색상
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dimBg: 'rgba(0, 0, 0, 0.25)',

  // 텍스트 색상
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // 상태 색상
  success: '#16A34A',
  error: '#DC2626',
  warning: '#EAB308',
  info: '#3B82F6',
} as const;

/**
 * 랭킹별 색상 매핑
 * Top 5 랭킹 표시에 사용
 */
export const rankingColors = {
  1: colors.blue500, // 파란색
  2: colors.cyan500, // 청록색
  3: colors.green600, // 초록색
  4: colors.yellow500, // 노란색
  5: colors.red600, // 빨간색
} as const;

/**
 * 타이머 게이지 색상 (시간 경과에 따라 변화)
 */
export const timerGaugeColors = {
  start: colors.blue500, // 시작: 파란색
  middle: colors.yellow500, // 중간: 노란색
  end: colors.red600, // 끝: 빨간색
} as const;

/**
 * 포모도로 세션 타입별 색상
 */
export const pomodoroColors = {
  study: colors.blue500,
  break: colors.green500,
  longBreak: colors.cyan500,
} as const;

/**
 * 테마별 색상 시스템
 * 테마에 따라 색상을 선택하여 사용
 */
export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.white,
    surface: colors.white,
    dimBg: colors.dimBg,
    tint: colors.blue500,
    icon: colors.gray600,
    tabIconDefault: colors.gray400,
    tabIconSelected: colors.blue500,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textTertiary,
    border: colors.gray200,
    borderSecondary: colors.gray300,
    cardBackground: colors.white,
    cardBorder: colors.gray200,
  },
  dark: {
    text: colors.white,
    background: colors.black,
    surface: colors.gray800,
    dimBg: colors.dimBg,
    tint: colors.blue400,
    icon: colors.gray300,
    tabIconDefault: colors.gray500,
    tabIconSelected: colors.blue400,
    textPrimary: colors.white,
    textSecondary: colors.gray300,
    textTertiary: colors.gray400,
    border: colors.gray700,
    borderSecondary: colors.gray600,
    cardBackground: colors.gray800,
    cardBorder: colors.gray700,
  },
} as const;

/**
 * 테마에 따라 색상 객체를 반환하는 헬퍼 함수
 * @param isDark 다크 모드 여부
 * @returns 테마별 색상 객체
 */
export const getThemeColors = (isDark: boolean) => {
  return isDark ? Colors.dark : Colors.light;
};
