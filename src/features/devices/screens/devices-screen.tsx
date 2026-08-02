import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDevices, useRegisterCurrentDevice } from '@/features/devices/hooks/use-devices';

export function DevicesScreen() {
  const { data: devices, isLoading } = useDevices();
  const registerDevice = useRegisterCurrentDevice();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Devices</ThemedText>

        <PrimaryButton
          title="Register this device"
          onPress={() => registerDevice.mutate()}
          loading={registerDevice.isPending}
        />

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
