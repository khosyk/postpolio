import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DailyTimerProps {
  totalMinutes: number;
}

// 데일리 타이머 컴포넌트
const DailyTimer: React.FC<DailyTimerProps> = ({ totalMinutes }) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>오늘의 공부 시간</Text>
      <Text style={styles.time}>
        {hours}h:{minutes.toString().padStart(2, '0')}m
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  time: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
});

export default DailyTimer;
