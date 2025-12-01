import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface BlockingLoaderProps {
  visible: boolean;
  message?: string;
}

const BlockingLoader = ({ visible, message }: BlockingLoaderProps) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents='auto'>
      <View style={styles.inner}>
        <ActivityIndicator size='large' color='#2ECC71' />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
};

export default BlockingLoader;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  inner: {
    minWidth: 160,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#111827',
  },
});
