import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getGroupUrl } from '@/config/api';
import Input from '@/components/Input';
import BlockingLoader from '@/components/BlockingLoader';
import { CreateGroupSchema } from '@/shared/schemas/group';

const CreateGroupScreen = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('오류', first.message);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(getGroupUrl('CREATE'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json().catch(() => undefined);
      if (response.ok && data?.success) {
        Alert.alert('성공', '그룹이 생성되었습니다.', [
          {
            text: '확인',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('오류', data?.message ?? '그룹 생성 중 오류가 발생했습니다.');
      }
    } catch {
      Alert.alert('오류', '그룹 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>새 그룹 만들기</Text>
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
      </SafeAreaView>
      <BlockingLoader visible={loading} message='그룹 생성 중...' />
    </>
  );
};

export default CreateGroupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    paddingHorizontal: 16,
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

