import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
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
import { router, useNavigation } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthUrl } from '@/config/api';
import { apiFetch } from '@/utils/apiClient';
import BlockingLoader from '@/components/BlockingLoader';
import { colors, Colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from 'react-native';

// 내 정보 변경 화면
const ProfileEditScreen = () => {
  const navigation = useNavigation();
  const { isDark, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);

  // Stack 네비게이션 헤더 숨기기
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // 테마 변경 핸들러
  const handleThemeToggle = async (value: boolean) => {
    try {
      await setTheme(value ? 'dark' : 'light');
      Alert.alert('완료', '테마 설정이 저장되었습니다. 앱을 재시작하면 적용됩니다.');
    } catch (error) {
      Alert.alert('오류', '테마 설정 저장 중 오류가 발생했습니다.');
    }
  };

  const avatarOptions = ['👤', '📚', '🔥', '🚀', '🌙', '⭐️'];

  const handleSave = async () => {
    if (!user) {
      Alert.alert('오류', '사용자 정보를 불러올 수 없습니다.');
      return;
    }

    const trimmed = nickname.trim();

    if (!trimmed) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    const safeNickname = trimmed.slice(0, 8);

    try {
      setSaving(true);
      await apiFetch<{ success?: boolean; message?: string }>(getAuthUrl('PROFILE'), {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify({
          displayName: safeNickname,
          avatar: avatar || null,
        }),
      });
      updateUser({ nickname: safeNickname, avatar: avatar || undefined });
      Alert.alert('완료', '정보가 변경되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      Alert.alert('오류', (e as Error).message ?? '정보 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : colors.white }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? Colors.dark.background : colors.white,
            borderBottomColor: isDark ? colors.gray700 : colors.gray200,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            name='chevron-left'
            size={24}
            color={isDark ? colors.white : colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textPrimary }]}>
          내 정보 변경
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: isDark ? colors.white : colors.textPrimary }]}
              >
                닉네임
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: isDark ? colors.gray700 : colors.gray200,
                    color: isDark ? colors.white : colors.textPrimary,
                    backgroundColor: isDark ? colors.gray800 : colors.white,
                  },
                ]}
                value={nickname}
                onChangeText={text => setNickname(text.slice(0, 8))}
                placeholder='닉네임을 입력하세요'
                placeholderTextColor={isDark ? colors.gray400 : colors.textTertiary}
                autoCapitalize='none'
                maxLength={8}
              />
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: isDark ? colors.white : colors.textPrimary }]}
              >
                아이콘
              </Text>
              <View style={styles.avatarOptionsRow}>
                {avatarOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.avatarOption,
                      {
                        backgroundColor: isDark
                          ? avatar === option
                            ? colors.gray700
                            : colors.gray800
                          : avatar === option
                            ? colors.blue50
                            : colors.gray100,
                      },
                      avatar === option && styles.avatarOptionSelected,
                    ]}
                    onPress={() => setAvatar(option)}
                  >
                    <Text style={styles.avatarOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {avatar && (
                <Text
                  style={[
                    styles.selectedAvatarText,
                    { color: isDark ? colors.gray300 : colors.textSecondary },
                  ]}
                >
                  선택된 아이콘: {avatar}
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: isDark ? colors.white : colors.textPrimary }]}
              >
                다크모드
              </Text>
              <View style={styles.themeRow}>
                <Text
                  style={[
                    styles.themeLabel,
                    { color: isDark ? colors.gray300 : colors.textSecondary },
                  ]}
                >
                  {isDark ? '다크 모드' : '라이트 모드'}
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  trackColor={{ false: colors.gray300, true: colors.blue500 }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      <BlockingLoader visible={saving} message='저장 중...' />
    </View>
  );
};

export default ProfileEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  placeholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  avatarOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: colors.blue500,
  },
  avatarOptionText: {
    fontSize: 28,
  },
  selectedAvatarText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  themeLabel: {
    fontSize: 16,
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.blue500,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
