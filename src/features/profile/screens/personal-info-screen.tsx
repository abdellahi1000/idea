import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { useUpdateProfile } from '@/features/profile/hooks/use-update-profile';
import { useUploadAvatar } from '@/features/profile/hooks/use-upload-avatar';
import { profileRepository } from '@/repositories/profile.repository';

export function PersonalInfoScreen() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [syncedProfileId, setSyncedProfileId] = useState<string | null>(null);

  if (profile && profile.id !== syncedProfileId) {
    setSyncedProfileId(profile.id);
    setFullName(profile.full_name);
    setPhone(profile.phone ?? '');
    setEmail(profile.email ?? '');
  }

  useEffect(() => {
    if (!profile?.profile_picture_path) return;
    profileRepository.getAvatarSignedUrl(profile.profile_picture_path).then(setAvatarUrl);
  }, [profile?.profile_picture_path]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      await uploadAvatar.mutateAsync(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onSave = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: fullName, phone, email: email || null });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loading}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Personal Information</ThemedText>

        <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <ThemedView type="backgroundElement" style={styles.avatarPlaceholder}>
              <ThemedText type="small">
                {uploadAvatar.isPending ? 'Uploading…' : 'Add photo'}
              </ThemedText>
            </ThemedView>
          )}
        </Pressable>

        <FormTextField label="Full name" value={fullName} onChangeText={setFullName} />
        <FormTextField label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <FormTextField
          label="Email (Optional)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <PrimaryButton title="Save changes" onPress={onSave} loading={updateProfile.isPending} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  avatarWrapper: { alignSelf: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
