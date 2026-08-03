import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  onScanned: (data: string) => void;
  onCancel: () => void;
};

export function QrScanner({ onScanned, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <ThemedText themeColor="textSecondary" style={styles.text}>
          Camera access is required to scan the QR code.
        </ThemedText>
        <PrimaryButton title="Grant Camera Access" onPress={requestPermission} />
        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                onScanned(data);
              }
        }
      />
      <View style={styles.overlay}>
        <ThemedText themeColor="textSecondary" style={styles.text}>
          Point your camera at the QR code shown on the new device.
        </ThemedText>
        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  text: { textAlign: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
