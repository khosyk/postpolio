import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/colors';

interface CheckmarkAnimationProps {
  visible: boolean;
  size?: number;
  color?: string;
  onAnimationComplete?: () => void;
}

// 체크 표시 애니메이션 컴포넌트
const CheckmarkAnimation = ({
  visible,
  size = 80,
  color = colors.blue500,
  onAnimationComplete,
}: CheckmarkAnimationProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pathLengthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 초기화
      scaleAnim.setValue(0);
      pathLengthAnim.setValue(0);
      opacityAnim.setValue(0);

      // 애니메이션 시작
      Animated.sequence([
        // 스케일 애니메이션 (튀어나오는 효과)
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 체크 표시 그리기 애니메이션
        Animated.timing(pathLengthAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // 애니메이션 완료 후 약간의 딜레이
        setTimeout(() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 500);
      });
    } else {
      // 숨기기
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      pathLengthAnim.setValue(0);
    }
  }, [visible, scaleAnim, pathLengthAnim, opacityAnim, onAnimationComplete]);

  // 체크 표시 경로 (SVG Path)
  const checkPath = `M ${size * 0.2} ${size * 0.5} L ${size * 0.45} ${size * 0.75} L ${
    size * 0.8
  } ${size * 0.25}`;
  const pathLength = size * 0.9; // 대략적인 경로 길이

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Svg width={size} height={size} style={styles.svg}>
          <AnimatedPath
            d={checkPath}
            stroke={color}
            strokeWidth={size * 0.1}
            strokeLinecap='round'
            strokeLinejoin='round'
            fill='none'
            strokeDasharray={pathLength}
            strokeDashoffset={pathLengthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [pathLength, 0],
            })}
          />
        </Svg>
      </View>
    </Animated.View>
  );
};

// Animated Path 컴포넌트
const AnimatedPath = Animated.createAnimatedComponent(Path);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  svg: {
    position: 'absolute',
  },
});

export default CheckmarkAnimation;
