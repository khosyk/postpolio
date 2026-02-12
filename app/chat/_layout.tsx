import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// 채팅 관련 화면 레이아웃
const ChatLayout = () => {
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='[groupId]' options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
};

export default ChatLayout;
