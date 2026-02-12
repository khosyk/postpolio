import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Colors, colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';

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
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: isDark ? colors.white : colors.textPrimary }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: isDark ? colors.gray800 : colors.white,
            borderColor: errorText
              ? colors.error
              : isSuccess
                ? colors.success
                : isDark
                  ? colors.gray700
                  : colors.gray200,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: isDark ? colors.white : colors.textPrimary },
            style,
          ]}
          placeholderTextColor={isDark ? colors.gray400 : Colors.light.tabIconDefault}
          secureTextEntry={isSecure}
          {...rest}
        />
        {secureToggle ? (
          <TouchableOpacity accessibilityRole='button' onPress={() => setIsSecure(v => !v)}>
            <Text style={[styles.toggle, { color: isDark ? colors.blue400 : Colors.light.tint }]}>
              {isSecure ? '보기' : '숨기기'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: isDark ? colors.gray300 : colors.textSecondary }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggle: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 6 },
  error: { marginTop: 6, color: colors.error, fontSize: 12 },
  helper: { marginTop: 6, fontSize: 12 },
});
