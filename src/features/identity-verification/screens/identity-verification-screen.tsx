import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  useIdentityVerification,
  useSubmitIdentityVerification,
} from '@/features/identity-verification/hooks/use-identity-verification';

function ImagePickerSlot({
  label,
  uri,
  onPick,
  useCamera,
}: {
  label: string;
  uri: string | null;
  onPick: (uri: string) => void;
  useCamera?: boolean;
}) {
  const pick = async () => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', `Allow ${useCamera ? 'camera' : 'photo library'} access to continue.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <Pressable onPress={pick}>
      <ThemedView type="backgroundElement" style={styles.imageSlot}>
        {uri ? (
          <Image source={{ uri }} style={styles.imagePreview} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

export function IdentityVerificationScreen() {
  const { data: verification, isLoading } = useIdentityVerification();
  const submitVerification = useSubmitIdentityVerification();

  const [documentNumber, setDocumentNumber] = useState('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!documentNumber || !frontUri || !selfieUri) {
      Alert.alert('Missing information', 'Please provide your ID number, ID front photo, and a selfie.');
      return;
    }

    try {
      await submitVerification.mutateAsync({
        documentType: 'national_id',
        documentNumber,
        documentFrontUri: frontUri,
        documentBackUri: backUri ?? undefined,
        selfieUri,
      });
      Alert.alert('Submitted', 'Your identity verification is now pending review.');
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loading}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (verification && verification.status !== 'rejected') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">Identity verification</ThemedText>
          <Badge label={verification.status === 'approved' ? 'Verified' : 'Pending'} />
          <ThemedText themeColor="textSecondary">
            {verification.status === 'approved'
              ? 'Your identity has been verified.'
              : 'Your submission is being reviewed. This usually takes a few minutes.'}
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Identity verification</ThemedText>

        {verification?.status === 'rejected' ? (
          <ThemedView type="backgroundElement" style={styles.rejectedBanner}>
            <Badge label="Rejected" />
            <ThemedText themeColor="textSecondary">
              {verification.rejection_reason ?? 'Please visit an authorized agency.'}
            </ThemedText>
          </ThemedView>
        ) : null}

        <FormTextField label="ID Number" value={documentNumber} onChangeText={setDocumentNumber} />

        <ImagePickerSlot label="ID Card - Front" uri={frontUri} onPick={setFrontUri} />
        <ImagePickerSlot label="ID Card - Back (optional)" uri={backUri} onPick={setBackUri} />
        <ImagePickerSlot label="Selfie" uri={selfieUri} onPick={setSelfieUri} useCamera />

        <PrimaryButton title="Submit for Verification" onPress={onSubmit} loading={submitVerification.isPending} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  imageSlot: {
    height: 140,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  rejectedBanner: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
});
