import { Modal, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accentColor?: string;
};

export function Dropdown<T extends string>({ value, options, onChange, open, onOpenChange, accentColor }: Props<T>) {
  const theme = useTheme();
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        onPress={() => onOpenChange(true)}
        style={[styles.trigger, { borderColor: accentColor ?? theme.primary }]}>
        <ThemedText type="smallBold" style={accentColor ? { color: accentColor } : { color: theme.primary }}>
          {selected?.label}
        </ThemedText>
        <ThemedText style={accentColor ? { color: accentColor } : { color: theme.primary }}>▾</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
        <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={styles.option}
                onPress={() => {
                  onChange(option.value);
                  onOpenChange(false);
                }}>
                <ThemedText
                  type={option.value === value ? 'smallBold' : 'default'}
                  themeColor={option.value === value ? undefined : 'text'}
                  style={option.value === value ? { color: accentColor ?? theme.primary } : undefined}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 220,
  },
  option: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
