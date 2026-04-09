import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import LineChart from '@/components/LineChart';
import StatsSummary from '@/components/StatsSummary';
import DatePickerModal from '@/components/DatePickerModal';
import { colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { FAKE_STATS_DATA } from '@/constants/fakeStatsData';

interface DailyStat {
  date: string;
  totalMinutes: number;
}

interface SummaryStat {
  totalDays: number;
  totalMinutes: number;
  averageMinutes: number;
  maxDailyMinutes: number;
}

type RangePreset = 'week' | 'month' | 'year' | 'custom';

// (실제 데이터는 constants/fakeStatsData.ts에서 하드코딩된 값 사용)

/**
 * 통계 탭
 * 공부 시간 통계를 날짜 범위 선택 및 줌 기능으로 시각화
 */
const StatsScreen: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStat | null>(null);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // 오늘 날짜
  const getToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const today = getToday();
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(today.getDate() - 6); // 기본 7일

  // 실제 통계 조회에 사용되는 적용된 날짜
  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);
  const [rangePreset, setRangePreset] = useState<RangePreset>('week');

  // 날짜 범위 문자열 변환 (API 호출 시 사용)
  // const dateRange = useMemo(() => {
  //   return {
  //     startDate: startDate.toISOString().split('T')[0],
  //     endDate: endDate.toISOString().split('T')[0],
  //   };
  // }, [startDate, endDate]);

  // 샘플 데이터 필터링 (개발/테스트용 - 하드코딩 데이터 사용)
  const generateSampleData = useCallback((start: Date, end: Date): DailyStat[] => {
    return FAKE_STATS_DATA.filter((item: DailyStat) => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
  }, []);

  // 통계 데이터 로드 (300ms 딜레이로 리렌더링 완화)
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const timer = setTimeout(() => {
      try {
        // 개발/테스트용: 항상 샘플 데이터 사용
        const stats = generateSampleData(startDate, endDate);
        setDailyStats(stats);

        if (stats.length > 0) {
          const totalMinutes = stats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
          const averageMinutes = Math.round(totalMinutes / stats.length);
          const maxDailyMinutes = Math.max(...stats.map(stat => stat.totalMinutes));
          setSummaryStats({
            totalDays: stats.length,
            totalMinutes,
            averageMinutes,
            maxDailyMinutes,
          });
        }
      } catch {
        const sampleStats = generateSampleData(startDate, endDate);
        setDailyStats(sampleStats);
        const totalMinutes = sampleStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
        const averageMinutes = Math.round(totalMinutes / sampleStats.length);
        const maxDailyMinutes = Math.max(...sampleStats.map(stat => stat.totalMinutes));
        setSummaryStats({
          totalDays: sampleStats.length,
          totalMinutes,
          averageMinutes,
          maxDailyMinutes,
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [user, startDate, endDate, generateSampleData]);

  // 그래프 데이터 변환
  const chartData = useMemo(() => {
    return dailyStats.map(stat => ({
      date: stat.date,
      value: stat.totalMinutes,
    }));
  }, [dailyStats]);

  // 최대/최소값 계산
  const { maxValue, minValue } = useMemo(() => {
    if (chartData.length === 0) {
      return { maxValue: 100, minValue: 0 };
    }
    const values = chartData.map(d => d.value);
    return {
      maxValue: Math.max(...values, 1),
      minValue: Math.min(...values, 0),
    };
  }, [chartData]);

  // 요약 통계 계산 (선택한 기간 기준)
  const periodSummary = useMemo(() => {
    if (!dailyStats.length) {
      return {
        totalMinutes: 0,
        averageMinutes: 0,
        maxDailyMinutes: 0,
        totalDays: 0,
      };
    }

    const totalMinutes = dailyStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
    const averageMinutes = Math.round(totalMinutes / dailyStats.length);
    const maxDailyMinutes = Math.max(...dailyStats.map(stat => stat.totalMinutes));
    const totalDays = dailyStats.length;

    return {
      totalMinutes,
      averageMinutes,
      maxDailyMinutes,
      totalDays,
    };
  }, [dailyStats]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>로그인이 필요합니다</Text>
      </View>
    );
  }

  // 날짜 포맷팅
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 종료일과 프리셋에 따라 시작/종료일 계산
  const calculateRangeFromEnd = (
    preset: Exclude<RangePreset, 'custom'>,
    baseEnd: Date,
  ): { start: Date; end: Date } => {
    // 종료일 기준으로 계산
    const newEnd = new Date(baseEnd);
    newEnd.setHours(0, 0, 0, 0);

    const newStart = new Date(newEnd);

    if (preset === 'week') {
      // 1주일
      newStart.setDate(newEnd.getDate() - 6);
    } else if (preset === 'month') {
      // 1개월
      newStart.setMonth(newEnd.getMonth() - 1);
      newStart.setDate(newStart.getDate() + 1);
    } else if (preset === 'year') {
      // 3개월
      newStart.setMonth(newEnd.getMonth() - 3);
      newStart.setDate(newStart.getDate() + 1);
    }

    newStart.setHours(0, 0, 0, 0);

    return { start: newStart, end: newEnd };
  };

  const handlePresetChange = (preset: Exclude<RangePreset, 'custom'>) => {
    const { start, end } = calculateRangeFromEnd(preset, endDate);
    setRangePreset(preset);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: themeColors.background,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>공부 통계</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 날짜 선택 영역 */}
        <View
          style={[
            styles.dateSelector,
            {
              backgroundColor: themeColors.cardBackground,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.dateRow}>
            {/* 시작일 */}
            <View style={styles.dateButton}>
              <Text style={[styles.dateLabel, { color: themeColors.textSecondary }]}>시작일</Text>
              <View style={styles.dateValueWrapper}>
                <Text
                  style={[
                    styles.dateValueText,
                    {
                      color: themeColors.textPrimary,
                    },
                  ]}
                >
                  {formatDate(startDate)}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            {/* 종료일 */}
            <TouchableOpacity
              style={styles.dateButton}
              activeOpacity={0.7}
              onPress={() => {
                setShowEndPicker(true);
              }}
            >
              <Text style={[styles.dateLabel, { color: themeColors.textSecondary }]}>종료일</Text>
              <View style={styles.dateValueWrapper}>
                <Text
                  style={[
                    styles.dateValueText,
                    {
                      color: themeColors.textPrimary,
                    },
                  ]}
                >
                  {formatDate(endDate)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.rangeTabsContainer, { borderTopColor: themeColors.border }]}>
            {(['week', 'month', 'year'] as const).map((preset, index) => {
              const label = preset === 'week' ? '1주일' : preset === 'month' ? '1개월' : '3개월';
              const isActive = rangePreset === preset;
              return (
                <Pressable
                  key={preset}
                  style={[
                    styles.rangeTab,
                    {
                      backgroundColor: isActive ? colors.blue600 : 'transparent',
                      borderLeftWidth: index === 1 ? 1 : 0,
                      borderRightWidth: index === 1 ? 1 : 0,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => handlePresetChange(preset)}
                >
                  <Text
                    style={[
                      styles.rangeTabText,
                      {
                        color: isActive ? colors.white : themeColors.textSecondary,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 선 그래프 */}
        {chartData.length > 0 ? (
          <View style={[styles.chartContainer, { backgroundColor: themeColors.surface }]}>
            <LineChart data={chartData} maxValue={maxValue} minValue={minValue} />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              데이터가 없습니다
            </Text>
          </View>
        )}

        {/* 통계 요약 */}
        {summaryStats && (
          <StatsSummary
            totalMinutes={periodSummary.totalMinutes}
            averageMinutes={periodSummary.averageMinutes}
            maxDailyMinutes={periodSummary.maxDailyMinutes}
            totalDays={periodSummary.totalDays}
          />
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents='auto'>
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size='large' color={colors.blue500} />
          </View>
        </View>
      )}

      {/* 종료일 선택 모달 */}
      <DatePickerModal
        visible={showEndPicker}
        value={endDate}
        minimumDate={new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)}
        maximumDate={new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)}
        onConfirm={date => {
          // 프리셋이 설정된 경우 종료일을 기준으로 다시 계산
          if (rangePreset === 'custom') {
            setEndDate(date);
          } else {
            const { start, end } = calculateRangeFromEnd(
              rangePreset as Exclude<RangePreset, 'custom'>,
              date,
            );
            setStartDate(start);
            setEndDate(end);
          }
          setShowEndPicker(false);
        }}
        onClose={() => setShowEndPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  dateSelector: {
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
  },
  rangeTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  rangeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    alignSelf: 'stretch',
  },
  rangeTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  divider: {
    width: 1,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateValueWrapper: {
    marginTop: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  dateValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hiddenDatePicker: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    opacity: 0.02,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalConfirmButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.blue500,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  chartContainer: {
    borderRadius: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayContent: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
});

export default StatsScreen;
