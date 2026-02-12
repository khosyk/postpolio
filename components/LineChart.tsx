import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const Y_AXIS_LABEL_WIDTH = 25;
// 통계 화면에서 카드까지 포함한 좌우 여백(화면 패딩 16 * 2 + 카드 패딩 16 * 2)
const CHART_HORIZONTAL_PADDING = 32;
// 카드 내부에서 실제로 보이는 차트 영역(뷰포트) 너비
const CHART_HEIGHT = 300;
const DATA_POINT_SPACING = 36; // 데이터 포인트 간 기본 간격
const INITIAL_SPACING = 18;
const END_SPACING = 10;

const CHART_VIEWPORT_WIDTH =
  SCREEN_WIDTH - CHART_HORIZONTAL_PADDING - Y_AXIS_LABEL_WIDTH - DATA_POINT_SPACING;

interface LineChartProps {
  data: { date: string; value: number }[];
  maxValue: number;
  minValue: number;
  onTouch?: (date: string, value: number) => void;
}

/**
 * react-native-gifted-charts 기반 선 그래프 컴포넌트
 * 공부 시간 추이를 시각화하며 기본 줌인/줌아웃 기능 제공
 *
 * 재사용 가능성: ⭐⭐⭐⭐⭐
 */
const LineChart: React.FC<LineChartProps> = ({ data, maxValue, minValue, onTouch }) => {
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);

  console.log('DATA', data);
  // Y축 레이블용 시간 포맷터 (분 → "X시간 Y분")
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}${mins > 0 ? `:${mins}` : ''}`;
    }
    return mins >= 1 ? `00:${mins}` : '';
  };

  // 데이터가 없을 때 처리
  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
        ]}
      >
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          데이터가 없습니다
        </Text>
      </View>
    );
  }

  // react-native-gifted-charts 형식으로 데이터 변환
  const chartData = useMemo(() => {
    return data.map(item => {
      const date = new Date(item.date);
      return {
        value: item.value,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        labelTextStyle: {
          color: themeColors.textSecondary,
          fontSize: 10,
        },
        // 각 포인트 위에 시간/분 형식으로 표시
        dataPointText: formatMinutes(item.value),
      };
    });
  }, [data, themeColors.textSecondary]);

  // Y축 범위 및 레이블 계산 (1시간 = 60분 간격)
  const { effectiveMin, effectiveMax, yAxisLabelTexts, sections } = useMemo(() => {
    // 최소는 항상 0분 기준
    const min = 0;

    // 데이터 범위에서 필요한 최대 시간(분) 계산
    const topMinutes = Math.max(maxValue, minValue, 60); // 최소 1시간 보장
    // 맨 위 데이터/텍스트가 잘리지 않도록 항상 1시간 버퍼 추가
    let topHour = Math.ceil(topMinutes / 60) + 1;
    if (topHour <= 0) topHour = 1;

    const max = topHour * 60; // 최상단 값 (예: 3시간 = 180분)

    const labels: string[] = [];
    for (let hour = 0; hour <= topHour; hour++) {
      const value = hour * 60;
      labels.push(formatMinutes(value));
    }

    return {
      effectiveMin: min,
      effectiveMax: max,
      yAxisLabelTexts: labels,
      sections: topHour,
    };
  }, [minValue, maxValue]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.surface, borderColor: themeColors.border },
      ]}
    >
      <GiftedLineChart
        data={chartData}
        width={CHART_VIEWPORT_WIDTH}
        height={CHART_HEIGHT}
        thickness={2}
        color={colors.blue500}
        hideRules={false}
        rulesType='solid'
        rulesColor={themeColors.borderSecondary}
        yAxisColor={themeColors.borderSecondary}
        xAxisColor={themeColors.borderSecondary}
        yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
        yAxisTextStyle={{
          color: themeColors.textSecondary,
          fontSize: 10,
        }}
        xAxisLabelTextStyle={{
          color: themeColors.textSecondary,
          fontSize: 10,
        }}
        hideYAxisText={false}
        maxValue={effectiveMax}
        yAxisOffset={effectiveMin}
        noOfSections={sections}
        yAxisLabelTexts={yAxisLabelTexts}
        areaChart
        startFillColor={colors.blue500}
        endFillColor={isDark ? colors.gray800 : colors.gray200}
        startOpacity={0.4}
        endOpacity={0.05}
        curved
        dataPointsColor={colors.blue500}
        dataPointsRadius={4}
        textShiftY={-4}
        textShiftX={-5}
        textFontSize={10}
        textColor={themeColors.textSecondary}
        verticalLinesColor={themeColors.borderSecondary}
        verticalLinesThickness={0.5}
        spacing={DATA_POINT_SPACING}
        initialSpacing={INITIAL_SPACING}
        endSpacing={END_SPACING}
        onPress={(item: any, index: number) => {
          if (onTouch && data[index]) {
            onTouch(data[index].date, data[index].value);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  tooltip: {
    backgroundColor: colors.gray200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  tooltipDate: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LineChart;
