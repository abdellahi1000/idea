import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { QrScanner } from '@/components/qr-scanner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDevices, useRegisterCurrentDevice } from '@/features/devices/hooks/use-devices';
import { deviceTransferService } from '@/services/device-transfer.service';

export function DevicesScreen() {
  const { data: devices, isLoading } = useDevices();
  const registerDevice = useRegisterCurrentDevice();
  const [isScanning, setIsScanning] = useState(false);

  const onScanned = async (code: string) => {
    setIsScanning(false);
    try {
      await deviceTransferService.approveQrCode(code);
      Alert.alert('Device approved', 'The new device can now continue signing in.');
    } catch (error) {
      Alert.alert('Could not approve device', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Devices</ThemedText>

        <PrimaryButton
          title="Register this device"
          onPress={() => registerDevice.mutate()}
          loading={registerDevice.isPending}
        />

        <PrimaryButton title="Scan QR to Approve New Device" onPress={() => setIsScanning(true)} />

        <Modal visible={isScanning} animationType="slide">
          <QrScanner onScanned={onScanned} onCancel={() => setIsScanning(false)} />
        </Modal>

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={devices ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<ThemedText themeColor="textSecondary">No devices registered yet.</ThemedText>}
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.row}>
                <ThemedText type="smallBold">{item.device_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.platform} · {item.status}
                </ThemedText>
              </ThemedView>
            )}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  row: { padding: Spacing.three, borderRadius: Spacing.two, marginBottom: Spacing.two, gap: Spacing.half },
});
