import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  length?: number;
  onComplete: (pin: string) => void;
  loading?: boolean;
  error?: string | null;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ length = 6, onComplete, loading, error }: Props) {
  const theme = useTheme();
  const [value, setValue] = useState('');

  const onKeyPress = (key: string) => {
    if (loading) return;
    if (key === '⌫') {
      setValue((current) => current.slice(0, -1));
      return;
    }
    if (key === '') return;

    const next = (value + key).slice(0, length);
    setValue(next);
    if (next.length === length) {
      onComplete(next);
      setValue('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                borderColor: theme.primary,
                backgroundColor: index < value.length ? theme.primary : 'transparent',
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.grid}>
        {KEYS.map((key, index) => (
          <Pressable
            key={index}
            disabled={key === '' || loading}
            onPress={() => onKeyPress(key)}
            style={({ pressed }) => [
              styles.key,
              pressed && key !== '' && { backgroundColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="title" style={styles.keyLabel}>
              {key}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.four },
  dots: { flexDirection: 'row', gap: Spacing.two },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 72,
    justifyContent: 'center',
  },
  key: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
  },
  keyLabel: { fontSize: 24 },
});
