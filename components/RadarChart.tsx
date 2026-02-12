import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RadarChart as GiftedRadarChart } from 'react-native-gifted-charts';
import { colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface RadarChartProps {
  data: { subject: string; target: number; current?: number }[];
  size?: number;
  colors?: { target: string; current: string };
}

/**
 * react-native-gifted-charts 기반 방사형 그래프 컴포넌트
 * 과목별 목표 점수와 현재 점수를 방사형 차트로 시각화
 *
 * 재사용 가능성: ⭐⭐⭐⭐⭐
 */
const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 280,
  colors: customColors = { target: colors.blue500, current: colors.green500 },
}) => {
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    // 최대값 계산 (목표 점수 중 최대값 또는 최고 점수)
    const maxTarget = Math.max(...data.map(item => item.target || 0), 1);
    const maxValue = Math.max(maxTarget, ...data.map(item => item.current || 0), 100);

    // 과목명 배열
    const labels = data.map(item => item.subject);

    // 목표 점수 배열
    const targetData = data.map(item => item.target);

    // 현재 점수 배열 (없으면 0)
    const currentData = data.map(item => item.current ?? 0);

    return {
      labels,
      targetData,
      currentData,
      maxValue,
    };
  }, [data]);

  if (!chartData) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          데이터가 없습니다
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <GiftedRadarChart
        data={chartData.currentData}
        dataSet={[chartData.targetData, chartData.currentData]}
        maxValue={chartData.maxValue}
        labels={chartData.labels}
        chartSize={size}
        noOfSections={3}
        isAnimated
        animationDuration={800}
        polygonConfigArray={[
          {
            // 목표 점수 폴리곤 (밝은 배경, 그라데이션 없음)
            showGradient: false,
            stroke: customColors.target,
            strokeWidth: 1,
            fill: customColors.target,
            opacity: 0.2,
            showDataValuesAsLabels: false,
          },
          {
            // 현재 점수 폴리곤 (컬러 채움)
            showGradient: false,
            stroke: customColors.current,
            strokeWidth: 3,
            fill: customColors.current,
            opacity: 0.4,
            showDataValuesAsLabels: true,
          },
        ]}
        // 기본 레이더 그리드(배경 폴리곤)의 채움/그라데이션 제거
        gridConfig={{
          stroke: themeColors.borderSecondary,
          strokeWidth: 1,
          fill: 'transparent',
          gradientColor: 'transparent',
          showGradient: false,
          opacity: 0,
          gradientOpacity: 0,
        }}
        labelConfig={{
          fontSize: 15,
          fontWeight: '500',
          stroke: themeColors.textPrimary,
          textAnchor: 'middle',
          alignmentBaseline: 'middle',
        }}
        labelsPositionOffset={15}
        dataLabelsPositionOffset={0}
        dataLabelsConfig={{
          fontSize: 13,
          fontWeight: '500',
          stroke: themeColors.textSecondary,
          textAnchor: 'middle',
          alignmentBaseline: 'middle',
        }}
        hideAsterLines={true}
        hideGrid={false}
        hideLabels={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});

// props가 변경되지 않으면 리렌더링 방지
export default React.memo(RadarChart, (prevProps, nextProps) => {
  // data 배열의 내용이 같으면 리렌더링하지 않음
  if (prevProps.data.length !== nextProps.data.length) return false;

  return (
    prevProps.data.every((item, index) => {
      const nextItem = nextProps.data[index];
      return (
        item.subject === nextItem.subject &&
        item.target === nextItem.target &&
        item.current === nextItem.current
      );
    }) && prevProps.size === nextProps.size
  );
});
