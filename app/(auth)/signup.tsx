import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Input from '@/components/Input';
import { SignUpSchema } from '@shared/schemas/auth';
import { z } from 'zod';
import { getAuthUrl } from '@/config/api';
import BlockingLoader from '@/components/BlockingLoader';
import { colors, Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import AppModal from '@/components/AppModal';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [passwordLevel, setPasswordLevel] = useState<1 | 2 | 3>(1);
  const { isDark } = useTheme();
  const [modalState, setModalState] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    isError?: boolean;
  }>({
    visible: false,
    title: '',
  });

  const showErrorModal = (message: string, title = '오류') => {
    setModalState({
      visible: true,
      title,
      subtitle: message,
      isError: true,
    });
  };

  const showInfoModal = (title: string, subtitle?: string) => {
    setModalState({
      visible: true,
      title,
      subtitle,
      isError: false,
    });
  };

  const stripControlChars = (value: string) =>
    Array.from(value)
      .filter(ch => {
        const code = ch.charCodeAt(0);
        return code >= 32 && code !== 127; // keep printable, drop control
      })
      .join('');

  const sanitize = (value: string) => {
    // 제거: 제어문자, 태그/스크립트 유발 기호, 공백 양끝
    return stripControlChars(value)
      .replace(/[<>"'`;]/g, '')
      .trim();
  };

  const stripControlAndSpaces = (value: string) => stripControlChars(value).replace(/\s/g, '');

  const evaluatePasswordLevel = (pwd: string): 1 | 2 | 3 => {
    let score = 0;
    if (pwd.length >= 8) score += 1; // 길이
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1; // 대소문자 혼합
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1; // 숫자+특수문자
    return Math.max(1, Math.min(3, score)) as 1 | 2 | 3;
  };

  const onEmailChange = (v: string) => {
    const next = sanitize(v.toLowerCase());
    setEmail(next);
    const res = z.string().email().safeParse(next);
    setEmailError(res.success ? undefined : '올바른 이메일 형식이 아닙니다.');
  };

  const onDisplayNameChange = (v: string) => {
    const next = sanitize(v).slice(0, 8); // 닉네임 최대 8자
    setDisplayName(next);
  };

  const onPasswordChange = (v: string) => {
    const next = stripControlAndSpaces(v); // 공백/제어 제거
    setPassword(next);
    const level = evaluatePasswordLevel(next);
    setPasswordLevel(level);
    const issues: string[] = [];
    if (next.length < 8) issues.push('8자 이상');
    if (!(/[A-Z]/.test(next) && /[a-z]/.test(next))) issues.push('대소문자 혼합');
    if (!(/[0-9]/.test(next) && /[^A-Za-z0-9]/.test(next))) issues.push('숫자+특수문자');
    setPasswordError(issues.length ? `보안 권장사항: ${issues.join(', ')}` : undefined);
  };

  const onConfirmChange = (v: string) => {
    const next = stripControlAndSpaces(v);
    setConfirmPassword(next);
    setConfirmError(next === password ? undefined : '비밀번호가 일치하지 않습니다.');
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      showErrorModal('모든 필드를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      showErrorModal('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 클라이언트 규칙: 공용 스키마로 선검증
    const toValidate = {
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName || undefined,
      avatar: '👤',
    };
    const parsed = SignUpSchema.safeParse(toValidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first.path[0] === 'email') setEmailError(first.message);
      if (first.path[0] === 'password') setPasswordError(first.message);
      showErrorModal(first.message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getAuthUrl('SIGNUP'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
          displayName: parsed.data.displayName || undefined,
          avatar: '👤',
        }),
      });

      const data = await response.json();

      if (data.success) {
        showInfoModal('회원가입이 완료되었습니다.', '로그인해주세요.');
        router.back();
      } else {
        showErrorModal(data.message || '회원가입 중 오류가 발생했습니다.');
      }
    } catch {
      showErrorModal('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
              회원가입
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
              새 계정을 만들어보세요
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Input
                label='이메일'
                value={email}
                onChangeText={onEmailChange}
                placeholder='이메일을 입력하세요'
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                errorText={emailError}
                isSuccess={
                  !emailError && email.length > 0 && z.string().email().safeParse(email).success
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <Input
                label='비밀번호'
                value={password}
                onChangeText={onPasswordChange}
                placeholder='비밀번호를 입력하세요 (최소 6자)'
                secureTextEntry
                secureToggle
                autoCapitalize='none'
                errorText={passwordError}
                isSuccess={!passwordError && passwordLevel >= 3 && password.length > 0}
              />
              <View style={styles.strengthBars}>
                <View
                  style={[
                    styles.bar,
                    passwordLevel >= 1
                      ? styles.barLevel1
                      : { backgroundColor: isDark ? colors.gray700 : colors.gray200 },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    passwordLevel >= 2
                      ? styles.barLevel2
                      : { backgroundColor: isDark ? colors.gray700 : colors.gray200 },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    passwordLevel >= 3
                      ? styles.barLevel3
                      : { backgroundColor: isDark ? colors.gray700 : colors.gray200 },
                  ]}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Input
                label='비밀번호 확인'
                value={confirmPassword}
                onChangeText={onConfirmChange}
                placeholder='비밀번호를 다시 입력하세요'
                secureTextEntry
                secureToggle
                autoCapitalize='none'
                errorText={confirmError}
                isSuccess={
                  !confirmError && confirmPassword === password && confirmPassword.length > 0
                }
              />
            </View>

            <View style={styles.inputContainer}>
              <Input
                label='닉네임 (선택사항)'
                value={displayName}
                onChangeText={onDisplayNameChange}
                placeholder='닉네임을 입력하세요'
                autoCapitalize='none'
              />
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color='#FFFFFF' />
              ) : (
                <Text style={styles.signUpButtonText}>회원가입</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
              이미 계정이 있으신가요?
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>로그인</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* API 요청 동안 전체 화면을 막는 로딩 오버레이 (boolean으로 제어) */}
      <BlockingLoader visible={loading} message='회원가입 중입니다...' />
      <AppModal
        visible={modalState.visible}
        onRequestClose={() =>
          setModalState(prev => ({
            ...prev,
            visible: false,
          }))
        }
        title={modalState.title}
        subtitle={modalState.subtitle}
        animationType='fade'
        type='confirm'
        confirmText='확인'
        confirmVariant={modalState.isError ? 'danger' : 'primary'}
        onConfirm={() =>
          setModalState(prev => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </>
  );
};

export default SignUpScreen;

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
  signUpButton: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
  },
  signUpButtonText: {
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
  loginLink: {
    color: '#2ECC71',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  bar: {
    height: 2,
    flex: 1,
    borderRadius: 2,
  },
  barOff: {
    // backgroundColor는 동적으로 설정
  },
  barLevel1: { backgroundColor: '#DC2626' }, // red
  barLevel2: { backgroundColor: '#F59E0B' }, // yellow
  barLevel3: { backgroundColor: '#10B981' }, // green
});
