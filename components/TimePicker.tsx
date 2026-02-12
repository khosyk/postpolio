import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/constants/colors';

interface TimePickerProps {
  label?: string;
  value: number; // 분 단위
  onChange: (minutes: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  errorText?: string;
}

// 시간 선택 컴포넌트 (분 단위, iOS/Android 지원)
const TimePicker = ({
  label,
  value,
  onChange,
  minimumValue = 1,
  maximumValue = 120,
  errorText,
}: TimePickerProps) => {
  const [show, setShow] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // 분을 Date 객체로 변환 (시간:분 형식, 시간은 0으로 고정)
  const minutesToDate = (minutes: number): Date => {
    const date = new Date();
    date.setHours(0);
    date.setMinutes(minutes);
    return date;
  };

  // Date 객체를 분으로 변환
  const dateToMinutes = (date: Date): number => {
    return date.getMinutes() + date.getHours() * 60;
  };

  const handleChange = (event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      const minutes = dateToMinutes(selectedDate);
      // 범위 체크
      const clampedMinutes = Math.max(minimumValue, Math.min(maximumValue, minutes));
      if (Platform.OS === 'ios') {
        // iOS에서는 임시 값만 업데이트
        setTempValue(clampedMinutes);
      } else {
        // Android에서는 바로 적용
        onChange(clampedMinutes);
        setShow(false);
      }
    }
  };

  const handleOpen = () => {
    setTempValue(value);
    setShow(true);
  };

  const handleDone = () => {
    onChange(tempValue);
    setShow(false);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins > 0 ? `${mins}분` : ''}`;
    }
    return `${mins}분`;
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={[styles.input, errorText && styles.inputError]} onPress={handleOpen}>
        <Text style={styles.inputText}>{formatTime(value)}</Text>
      </TouchableOpacity>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {show && Platform.OS === 'ios' ? (
        <Modal
          transparent
          visible={show}
          animationType='slide'
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.modalCancel}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label || '시간 선택'}</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={styles.modalDone}>완료</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={minutesToDate(tempValue)}
                mode='time'
                display='spinner'
                onChange={handleChange}
                minuteInterval={1}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={minutesToDate(value)}
            mode='time'
            display='default'
            onChange={handleChange}
            minuteInterval={1}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
    minHeight: 44,
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
  picker: {
    height: 200,
  },
});

export default TimePicker;
