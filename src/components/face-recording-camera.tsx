import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  /** Step-by-step instructions shown one at a time during the recording,
   * e.g. ['Look Right', 'Look Left', 'Blink']. */
  challenge: string[];
  durationMs?: number;
  onComplete: (localUri: string) => void;
  onCancel: () => void;
};

export function FaceRecordingCamera({ challenge, durationMs = 5000, onComplete, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [recording, setRecording] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!recording) return;
    const stepDuration = durationMs / challenge.length;
    const interval = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, challenge.length - 1));
    }, stepDuration);
    return () => clearInterval(interval);
  }, [recording, durationMs, challenge.length]);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <ThemedText themeColor="textSecondary" style={styles.permissionText}>
          Camera access is required to record your JOJO Face Identity.
        </ThemedText>
        <PrimaryButton title="Grant Camera Access" onPress={requestPermission} />
        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    );
  }

  const onStart = async () => {
    if (!cameraRef.current) return;
    setStepIndex(0);
    setRecording(true);

    const video = await cameraRef.current.recordAsync({ maxDuration: Math.ceil(durationMs / 1000) });
    setRecording(false);
    if (video?.uri) {
      onComplete(video.uri);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />

      <View style={styles.overlay}>
        {recording ? (
          <ThemedText type="title" style={styles.instruction}>
            {challenge[stepIndex]}
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary" style={styles.hint}>
            This is a live recording only - no gallery uploads are allowed. Follow the on-screen
            instructions while recording.
          </ThemedText>
        )}

        {recording ? null : (
          <View style={styles.actions}>
            <PrimaryButton title="Start Recording" onPress={onStart} />
            <PrimaryButton title="Cancel" onPress={onCancel} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  permissionText: { textAlign: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  instruction: { color: '#ffffff', textAlign: 'center' },
  hint: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});
