import React from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * 공용 날짜 선택 모달 래퍼.
 * - iOS / Android 모두 `react-native-modal-datetime-picker` 를 사용합니다.
 * - onChange는 라이브러리 내부에 맡기고, onConfirm에서만 부모로 날짜를 전달합니다.
 */
const DatePickerModal = ({
  visible,
  value,
  onConfirm,
  onClose,
  minimumDate,
  maximumDate,
}: DatePickerModalProps) => {
  return (
    <DateTimePickerModal
      isVisible={visible}
      mode='date'
      date={value}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      // 실제 선택 확정 시에만 상위로 전달
      onConfirm={date => {
        onConfirm(date);
        onClose();
      }}
      onCancel={onClose}
    />
  );
};

export default DatePickerModal;
