import React, { useState, useLayoutEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';

import { getGroupUrl } from '@/config/api';
import Input from '@/components/Input';
import BlockingLoader from '@/components/BlockingLoader';
import { CreateGroupSchema } from '@/shared/schemas/group';
import { apiFetch } from '@/utils/apiClient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors, Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AppModal from '@/components/AppModal';

const CreateGroupScreen = () => {
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    isError?: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
  });

  const closeModal = () =>
    setModalState(prev => ({
      ...prev,
      visible: false,
      onConfirm: undefined,
    }));

  const showErrorModal = (message: string, title = '오류') => {
    setModalState({
      visible: true,
      title,
      subtitle: message,
      isError: true,
    });
  };

  const showInfoModal = (title: string, subtitle?: string, onConfirm?: () => void) => {
    setModalState({
      visible: true,
      title,
      subtitle,
      isError: false,
      onConfirm,
    });
  };

  // Stack 네비게이션 헤더 숨기기
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleCreate = async () => {
    setNameError('');

    const parsed = CreateGroupSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first.path[0] === 'name') {
        setNameError(first.message);
      }
      showErrorModal(first.message);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        data?: { group: { id: string } };
      }>(getGroupUrl('CREATE'), {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });

      if (data.success) {
        showInfoModal('그룹이 생성되었습니다.', undefined, () => router.back());
      } else {
        showErrorModal(data.message ?? '그룹 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '그룹 생성 중 오류가 발생했습니다.';
      if (!errorMessage.includes('인증')) {
        showErrorModal(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? Colors.dark.background : colors.white,
                borderBottomColor: isDark ? colors.gray700 : colors.gray200,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol
                name='arrow-back'
                size={24}
                color={isDark ? colors.white : colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.title, { color: isDark ? colors.white : colors.textPrimary }]}>
              새 그룹 만들기
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label='그룹명'
              value={name}
              onChangeText={setName}
              placeholder='그룹명을 입력하세요'
              errorText={nameError}
              autoCapitalize='none'
            />

            <Input
              label='설명 (선택)'
              value={description}
              onChangeText={setDescription}
              placeholder='그룹 설명을 입력하세요'
              multiline
              numberOfLines={4}
              style={styles.descriptionInput}
            />

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>그룹 만들기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BlockingLoader visible={loading} message='그룹 생성 중...' />
      <AppModal
        visible={modalState.visible}
        onRequestClose={closeModal}
        title={modalState.title}
        subtitle={modalState.subtitle}
        animationType='fade'
        type='confirm'
        confirmText='확인'
        confirmVariant={modalState.isError ? 'danger' : 'primary'}
        onConfirm={() => {
          if (modalState.onConfirm) {
            modalState.onConfirm();
          }
          closeModal();
        }}
      />
    </>
  );
};

export default CreateGroupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
