import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

interface SkeletonGroupCardProps {
  style?: ViewStyle;
}

export const SkeletonGroupCard = ({ style }: SkeletonGroupCardProps) => {
  return (
    <View style={[styles.groupCard, style]}>
      <View style={styles.groupCardContent}>
        <Skeleton width={120} height={16} style={styles.groupNameSkeleton} />
        <Skeleton width={200} height={14} style={styles.groupDescriptionSkeleton} />
        <Skeleton width={80} height={12} style={styles.groupDateSkeleton} />
      </View>
      <Skeleton width={24} height={24} borderRadius={12} />
    </View>
  );
};

interface SkeletonChipProps {
  style?: ViewStyle;
}

export const SkeletonChip = ({ style }: SkeletonChipProps) => {
  return <View style={[styles.chip, style]} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupCardContent: {
    flex: 1,
  },
  groupNameSkeleton: {
    marginBottom: 8,
  },
  groupDescriptionSkeleton: {
    marginBottom: 8,
  },
  groupDateSkeleton: {
    marginTop: 4,
  },
  chip: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
    opacity: 0.6,
  },
});

