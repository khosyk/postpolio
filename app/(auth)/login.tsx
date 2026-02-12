import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthUrl } from '@/config/api';
import BlockingLoader from '@/components/BlockingLoader';
import { colors, Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

// 로그인 화면 컴포넌트
const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { isDark } = useTheme();

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getAuthUrl('SIGNIN'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // AuthContext를 통해 로그인 처리
        await login(data.data.user, data.data.accessToken || '', data.data.refreshToken);

        Alert.alert('성공', '로그인되었습니다.');
        router.replace('/(tabs)');
      } else {
        Alert.alert('오류', data.message);
      }
    } catch {
      Alert.alert('오류', '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? colors.white : colors.textPrimary }]}>
              환영합니다
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
              로그인하여 채팅을 시작하세요
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: isDark ? colors.white : colors.textPrimary }]}>
                이메일
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.gray800 : colors.white,
                    borderColor: isDark ? colors.gray700 : colors.gray200,
                    color: isDark ? colors.white : colors.textPrimary,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder='이메일을 입력하세요'
                placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: isDark ? colors.white : colors.textPrimary }]}>
                비밀번호
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.gray800 : colors.white,
                    borderColor: isDark ? colors.gray700 : colors.gray200,
                    color: isDark ? colors.white : colors.textPrimary,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder='비밀번호를 입력하세요'
                placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                secureTextEntry
                autoCapitalize='none'
              />
            </View>

            <TouchableOpacity
              style={[styles.emailButton, loading && styles.disabledButton]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color='#FFFFFF' />
              ) : (
                <Text style={styles.emailButtonText}>이메일로 로그인</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
              계정이 없으신가요?
            </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* API 요청 동안 전체 화면을 막는 로딩 오버레이 (boolean으로 제어) */}
      <BlockingLoader visible={loading} message='로그인 중입니다...' />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  emailButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  signUpLink: {
    color: '#2ECC71',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LoginScreen;
