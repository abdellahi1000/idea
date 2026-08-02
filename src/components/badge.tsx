import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { label: string };

export function Badge({ label }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: theme.accent }]}>
      <ThemedText type="small" style={{ color: theme.accentText }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
