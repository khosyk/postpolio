import { ScrollView, StyleSheet } from 'react-native';
import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import { ThemedText } from '@/components/ThemedText';

export default function TabTwoScreen() {
  return (
    <ScrollView>
      <Collapsible title='File-based routing'>
        <ThemedText>
          This app has two screens:{' '}
          <ThemedText type='defaultSemiBold'>app/(tabs)/index.tsx</ThemedText> and{' '}
          <ThemedText type='defaultSemiBold'>app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ThemedText>
          The layout file in <ThemedText type='defaultSemiBold'>app/(tabs)/_layout.tsx</ThemedText>{' '}
          sets up the tab navigator.
        </ThemedText>
        <ExternalLink href='https://docs.expo.dev/router/introduction'>
          <ThemedText type='link'>Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
