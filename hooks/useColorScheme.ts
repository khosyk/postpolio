import { useTheme } from '@/contexts/ThemeContext';

/**
 * 사용자 설정을 고려한 테마 훅
 * ThemeContext를 사용하여 테마 정보를 가져옵니다.
 * @deprecated useTheme 훅을 직접 사용하는 것을 권장합니다.
 */
export function useColorScheme(): 'light' | 'dark' | null {
  try {
    const { colorScheme } = useTheme();
    return colorScheme;
  } catch {
    // ThemeProvider 외부에서 사용되는 경우 기본값 반환
    return 'light';
  }
}
