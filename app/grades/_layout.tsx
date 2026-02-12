import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// 성적표 관련 화면 레이아웃
const GradesLayout = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.background : colors.white,
      }}
      edges={['top']}
    >
      <Stack>
        <Stack.Screen name='create' options={{ headerShown: false }} />
        <Stack.Screen name='[examId]/subjects' options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
};

export default GradesLayout;
