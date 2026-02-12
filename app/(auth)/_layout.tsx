import { Stack } from 'expo-router';

// 인증 레이아웃 컴포넌트
const AuthLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name='login' />
      <Stack.Screen name='signup' />
    </Stack>
  );
};

export default AuthLayout;
