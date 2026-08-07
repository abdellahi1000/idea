import { Modal, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  deviceName: string | null;
  approved: boolean;
  loading?: boolean;
  onCancel: () => void;
  onApprove: () => void;
};

export function DeviceTransferConfirmSheet({ visible, deviceName, approved, loading, onCancel, onApprove }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <ThemedView style={styles.backdrop}>
        <ThemedView type="backgroundElement" style={styles.sheet}>
          {approved ? (
            <ThemedView style={styles.centered}>
              <ThemedText style={styles.checkmark}>✓</ThemedText>
              <ThemedText type="smallBold">Device approved</ThemedText>
            </ThemedView>
          ) : (
            <>
              <ThemedText type="title">Transfer to a New Device</ThemedText>
              <ThemedText themeColor="textSecondary">
                You are about to transfer your banking application to:
              </ThemedText>
              <ThemedText type="smallBold">{deviceName ?? 'Unknown device'}</ThemedText>
              <ThemedText themeColor="textSecondary">Do you want to continue?</ThemedText>

              <ThemedView style={styles.actions}>
                <ThemedView style={styles.actionButton}>
                  <PrimaryButton title="Cancel" onPress={onCancel} disabled={loading} />
                </ThemedView>
                <ThemedView style={styles.actionButton}>
                  <PrimaryButton title="Approve" onPress={onApprove} loading={loading} />
                </ThemedView>
              </ThemedView>
            </>
          )}
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  actions: { flexDirection: 'row', gap: Spacing.three },
  actionButton: { flex: 1 },
  centered: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  checkmark: { fontSize: 48, color: '#22c55e' },
});
