import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface MinutePickerProps {
  label?: string;
  value: number; // 분 단위
  onChange: (minutes: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  errorText?: string;
}

// 분 단위 시간 선택 컴포넌트 (최대 24시간 = 1440분)
const MinutePicker: React.FC<MinutePickerProps> = ({
  label,
  value,
  onChange,
  minimumValue = 1,
  maximumValue = 1440,
  errorText,
}) => {
  // RN useColorScheme 대신 ThemeContext 기반 사용
  const { isDark } = useTheme();
  const theme = getThemeColors(isDark);
  const insets = useSafeAreaInsets();

  const [show, setShow] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins > 0 ? `${mins}분` : ''}`;
    }
    return `${mins}분`;
  };

  const handleOpen = () => {
    setTempValue(value);
    setShow(true);
  };

  const handleDone = () => {
    const clamped = Math.max(minimumValue, Math.min(maximumValue, tempValue));
    onChange(clamped);
    setShow(false);
  };

  // 시간과 분 옵션 생성
  const hours = Array.from({ length: 25 }, (_, i) => i); // 0-24시간
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59분

  const handleHourChange = (hour: number) => {
    const newMinutes = hour * 60 + (tempValue % 60);
    const clampedMinutes = Math.max(minimumValue, Math.min(maximumValue, newMinutes));
    setTempValue(clampedMinutes);
  };

  const handleMinuteChange = (minute: number) => {
    const currentHours = Math.floor(tempValue / 60);
    const newMinutes = currentHours * 60 + minute;
    const clampedMinutes = Math.max(minimumValue, Math.min(maximumValue, newMinutes));
    setTempValue(clampedMinutes);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text> : null}
      <TouchableOpacity
        style={[
          styles.input,
          {
            borderColor: errorText ? colors.error : theme.border,
            backgroundColor: theme.cardBackground,
          },
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, { color: theme.textPrimary }]}>{formatTime(value)}</Text>
      </TouchableOpacity>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {show && (
        <Modal
          transparent
          visible={show}
          animationType='slide'
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.surface,
                  paddingBottom: insets.bottom + 56,
                },
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>취소</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {label || '시간 선택'}
                </Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={styles.modalDone}>완료</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerWrapper}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>시간</Text>
                  <Picker
                    selectedValue={Math.floor(tempValue / 60)}
                    onValueChange={handleHourChange}
                    style={styles.picker}
                  >
                    {hours.map(hour => (
                      <Picker.Item key={hour} label={`${hour}시간`} value={hour} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.pickerWrapper}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>분</Text>
                  <Picker
                    selectedValue={tempValue % 60}
                    onValueChange={handleMinuteChange}
                    style={styles.picker}
                  >
                    {minutes.map(minute => (
                      <Picker.Item key={minute} label={`${minute}분`} value={minute} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    minHeight: 40,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.error,
  },
  inputText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalDone: {
    fontSize: 16,
    color: colors.blue500,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
  },
  pickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  picker: {
    width: '100%',
    height: 150,
  },
});

export default MinutePicker;
