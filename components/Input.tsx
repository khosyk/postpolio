import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = TextInputProps & {
  label?: string;
  errorText?: string;
  helperText?: string;
  secureToggle?: boolean; // 비밀번호 눈아이콘 토글
  isSuccess?: boolean; // 검증 성공 시 초록색 보더
};

export default function Input({
  label,
  errorText,
  helperText,
  secureTextEntry,
  secureToggle = false,
  style,
  isSuccess = false,
  ...rest
}: Props) {
  const [isSecure, setIsSecure] = useState<boolean>(!!secureTextEntry);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          errorText ? styles.inputRowError : isSuccess ? styles.inputRowSuccess : undefined,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.light.tabIconDefault}
          secureTextEntry={isSecure}
          {...rest}
        />
        {secureToggle ? (
          <TouchableOpacity accessibilityRole='button' onPress={() => setIsSecure(v => !v)}>
            <Text style={styles.toggle}>{isSecure ? '보기' : '숨기기'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputRowError: { borderColor: '#DC2626' },
  inputRowSuccess: { borderColor: '#10B981' },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  toggle: { color: Colors.light.tint, fontSize: 12, paddingHorizontal: 8, paddingVertical: 6 },
  error: { marginTop: 6, color: '#DC2626', fontSize: 12 },
  helper: { marginTop: 6, color: '#6B7280', fontSize: 12 },
});
