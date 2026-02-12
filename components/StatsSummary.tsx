import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface StatsSummaryProps {
  totalMinutes: number;
  averageMinutes: number;
  maxDailyMinutes: number;
  totalDays: number;
}

/**
 * 통계 요약 컴포넌트
 * 선택한 기간의 공부 시간 통계를 카드 형태로 표시
 *
 * 재사용 가능성: ⭐⭐⭐⭐
 */
const StatsSummary: React.FC<StatsSummaryProps> = ({
  totalMinutes,
  averageMinutes,
  maxDailyMinutes,
  totalDays,
}) => {
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);

  // 분을 시간과 분으로 변환
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View
          style={[
            styles.card,
            styles.cardLeft,
            {
              backgroundColor: themeColors.cardBackground,
              borderWidth: 1,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>총 공부 시간</Text>
          <Text style={[styles.value, { color: themeColors.textPrimary }]}>
            {formatTime(totalMinutes)}
          </Text>
        </View>
        <View
          style={[
            styles.card,
            styles.cardRight,
            {
              backgroundColor: themeColors.cardBackground,
              borderWidth: 1,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>평균 일일</Text>
          <Text style={[styles.value, { color: themeColors.textPrimary }]}>
            {formatTime(averageMinutes)}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View
          style={[
            styles.card,
            styles.cardLeft,
            {
              backgroundColor: themeColors.cardBackground,
              borderWidth: 1,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>최대 일일</Text>
          <Text style={[styles.value, { color: themeColors.textPrimary }]}>
            {formatTime(maxDailyMinutes)}
          </Text>
        </View>
        <View
          style={[
            styles.card,
            styles.cardRight,
            {
              backgroundColor: themeColors.cardBackground,
              borderWidth: 1,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>공부한 일수</Text>
          <Text style={[styles.value, { color: themeColors.textPrimary }]}>{totalDays}일</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 0,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardLeft: {
    marginRight: 6,
  },
  cardRight: {
    marginLeft: 6,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default StatsSummary;
