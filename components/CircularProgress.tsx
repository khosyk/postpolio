import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number; // 0 to 1
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  animated?: boolean;
}

// 원형 프로그레스 컴포넌트 (시계 기준 10시 위치에서 시작)
const CircularProgress = ({
  progress,
  size,
  strokeWidth,
  color,
  backgroundColor = '#E5E7EB',
  animated = true,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // 시계 기준 10시 위치에서 시작 (270도에서 시작, 시계방향으로 진행)
  // 10시 = 270도 - 60도 = 210도
  const startAngle = -150; // 10시 위치 (시계 기준)
  const offset = circumference - progress * circumference;

  const animatedProgress = useSharedValue(progress);

  React.useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const currentProgress = animatedProgress.value;
    const currentOffset = circumference - currentProgress * circumference;
    return {
      strokeDashoffset: currentOffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* 배경 원 */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill='transparent'
          transform={`rotate(${startAngle} ${center} ${center})`}
        />
        {/* 진행 원 */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill='transparent'
          strokeDasharray={circumference}
          strokeLinecap='round'
          transform={`rotate(${startAngle} ${center} ${center})`}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
});

export default CircularProgress;
