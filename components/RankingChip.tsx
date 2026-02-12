import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { rankingColors, colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface RankingChipProps {
  rank: number;
  displayName: string;
  avatar: string;
  totalMinutes: number;
  isActive?: boolean; // 공부 활성화 여부 (애니메이션 제어)
  liveTimerText?: string; // 실시간 세션 타이머 텍스트
  showRankBadge?: boolean; // 등수 뱃지 표시 여부
}

// 랭킹 칩 컴포넌트
const RankingChip: React.FC<RankingChipProps> = ({
  rank,
  displayName,
  avatar,
  totalMinutes,
  isActive = true,
  liveTimerText,
  showRankBadge = true,
}) => {
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      // 공부 종료 시 애니메이션 중지
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, [rotateAnim, isActive]);

  const rankColor = rankingColors[rank as keyof typeof rankingColors] || rankingColors[5];

  // 보더를 따라 색이 흐르는 느낌을 위해 상단/우측만 색을 주고 회전
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalTimeLabel = `${hours}h ${minutes.toString().padStart(2, '0')}m`;

  // 닉네임은 최대 8글자로 제한
  const truncatedName = displayName.length > 8 ? displayName.slice(0, 8) : displayName;

  // 1등 배지 색상 (노란색 계열)
  const firstRankBadgeBg = colors.yellow500;
  const firstRankBadgeShadow = colors.yellow600;

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        {/* 회전하는 보더 하이라이트 (내용 박스를 2px 정도 감싸는 링) */}
        {isActive && (
          <Animated.View
            style={[
              styles.rotatingBorder,
              {
                borderTopColor: rankColor,
                borderRightColor: rankColor,
                transform: [{ rotate }],
              },
              rank === 1 && [
                styles.firstRing,
                {
                  shadowColor: firstRankBadgeShadow,
                },
              ],
            ]}
          />
        )}

        {/* 실제 콘텐츠 박스 */}
        <View
          style={[
            styles.chip,
            {
              backgroundColor: themeColors.cardBackground,
            },
          ]}
        >
          {/* 랭킹 배지 (#1, #2, #3 ...) - 왼쪽 위 */}
          {showRankBadge && rank > 0 && (
            <View
              style={[
                styles.rankBadge,
                {
                  backgroundColor: rank === 1 ? firstRankBadgeBg : themeColors.cardBackground,
                },
                rank === 1 && [
                  styles.firstRankBadge,
                  {
                    shadowColor: firstRankBadgeShadow,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.rankBadgeText,
                  {
                    color: rank === 1 ? colors.gray900 : themeColors.textSecondary,
                  },
                ]}
              >
                #{rank}
              </Text>
            </View>
          )}

          {/* 내용 영역 (텍스트가 칩 전체를 사용) */}
          <View style={styles.contentContainer}>
            <Text
              style={[
                styles.name,
                {
                  color: themeColors.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              {truncatedName}
            </Text>
            <Text
              style={[
                styles.time,
                {
                  color: themeColors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {totalTimeLabel}
            </Text>
            {liveTimerText && (
              <Text
                style={[
                  styles.liveTime,
                  {
                    color: themeColors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {liveTimerText}
              </Text>
            )}
          </View>

          {/* 아바타: 텍스트 위에 겹쳐지는 레이어 (absolute + opacity) */}
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: themeColors.surface,
              },
            ]}
          >
            <Text style={styles.avatar}>{avatar}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  wrapper: {
    padding: 2, // 내용 박스보다 2px 크게 래핑
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  chip: {
    width: 160, // 가로는 더 줄이고
    height: 68, // 세로는 늘려서 3줄 텍스트 여유 확보
    borderRadius: 12,
    borderWidth: 0, // 외곽 보더는 제거하고 테마 배경만 사용
    position: 'relative',
    overflow: 'hidden',
  },
  rankBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  firstRankBadge: {},
  // 래핑 박스 안에서 도는 보더 하이라이트
  rotatingBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 14,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    zIndex: 1,
  },
  firstRing: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  contentContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: '100%',
    zIndex: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  liveTime: {
    fontSize: 11,
  },
  avatarContainer: {
    position: 'absolute',
    right: 8,
    top: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  avatar: {
    fontSize: 22,
  },
});

export default RankingChip;
