import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { timerGaugeColors } from '@/constants/colors';

interface TimerGaugeProps {
  duration: number; // 체크인 간격 (분)
  elapsed: number; // 경과 시간 (초)
  onComplete?: () => void;
}

// 타이머 게이지 컴포넌트
const TimerGauge: React.FC<TimerGaugeProps> = ({ duration, elapsed, onComplete }) => {
  const [progress] = useState(new Animated.Value(0));
  const [color] = useState(new Animated.Value(0));

  useEffect(() => {
    const totalSeconds = duration * 60;
    const progressValue = Math.min(elapsed / totalSeconds, 1);

    Animated.parallel([
      Animated.timing(progress, {
        toValue: progressValue,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(color, {
        toValue: progressValue,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();

    if (progressValue >= 1 && onComplete) {
      onComplete();
    }
  }, [elapsed, duration, progress, color, onComplete]);

  const gaugeColor = color.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [timerGaugeColors.start, timerGaugeColors.middle, timerGaugeColors.end],
  });

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              backgroundColor: gaugeColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  track: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default TimerGauge;
