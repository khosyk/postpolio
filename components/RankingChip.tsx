import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { rankingColors, colors, getThemeColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface RankingChipProps {
  rank: number;
  displayName: string;
  avatar: string;
  totalMinutes: number;
  isActive?: boolean;
  liveTimerText?: string;
  showRankBadge?: boolean;
}

const CHIP_SIZE = 60;
const RING_SIZE = CHIP_SIZE + 4;
const RING_RADIUS = RING_SIZE / 2;

const RankingChip: React.FC<RankingChipProps> = ({
  rank,
  displayName,
  avatar,
  totalMinutes,
  isActive = false,
  showRankBadge = true,
}) => {
  const { isDark } = useTheme();
  const themeColors = getThemeColors(isDark);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
      return;
    }

    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  }, [isActive, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rankColor = rankingColors[rank as keyof typeof rankingColors] || rankingColors[5];
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalTimeLabel = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  const truncatedName = displayName.length > 8 ? displayName.slice(0, 8) : displayName;

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <View style={[styles.trackRing, { borderColor: themeColors.border }]} />
        {isActive && (
          <Animated.View
            pointerEvents='none'
            style={[
              styles.activeRing,
              {
                borderTopColor: rankColor,
                borderRightColor: rankColor,
                transform: [{ rotate }],
              },
            ]}
          />
        )}

        <View style={[styles.chip, { backgroundColor: themeColors.cardBackground }]}>
          {showRankBadge && rank > 0 && (
            <View
              style={[
                styles.rankBadge,
                { backgroundColor: rank === 1 ? colors.yellow500 : themeColors.surface },
              ]}
            >
              <Text
                style={[
                  styles.rankBadgeText,
                  { color: rank === 1 ? colors.gray900 : themeColors.textSecondary },
                ]}
              >
                #{rank}
              </Text>
            </View>
          )}

          <View style={[styles.avatarContainer, { backgroundColor: themeColors.surface }]}>
            <Text style={styles.avatar}>{avatar}</Text>
          </View>
          <View style={styles.textStack}>
            <Text style={[styles.name, { color: themeColors.textPrimary }]} numberOfLines={1}>
              {truncatedName}
            </Text>
            <Text style={[styles.time, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {totalTimeLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
  },
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_RADIUS,
    borderWidth: 2,
  },
  activeRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_RADIUS,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  rankBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
    zIndex: 1,
  },
  avatar: {
    fontSize: 30,
  },
  textStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 8,
    gap: 1,
  },
  name: {
    width: '100%',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
  },
  time: {
    width: '100%',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '500',
  },
});

export default RankingChip;
