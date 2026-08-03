import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { useBiometric } from '@/features/profile/hooks/use-biometric';
import { authService } from '@/services/auth.service';
import { useTheme } from '@/hooks/use-theme';

function SettingsRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function SettingsScreen() {
  const { data: profile } = useProfile();
  const biometric = useBiometric();
  const theme = useTheme();

  const onToggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        await biometric.enable();
      } else {
        await biometric.disable();
      }
    } catch (error) {
      Alert.alert('Biometric setup failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onSignOut = async () => {
    await authService.signOut();
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText themeColor="textSecondary">{profile?.full_name}</ThemedText>

        <SettingsRow label="Personal Information" onPress={() => router.push('/personal-info')} />
        <SettingsRow label="Identity Verification" onPress={() => router.push('/identity-verification')} />
        <SettingsRow label="Face Identity Verification" onPress={() => router.push('/create-face-identity')} />

        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedView style={styles.biometricRow}>
            <ThemedText type="smallBold">Biometric Authentication</ThemedText>
            <Switch
              value={biometric.enrolled}
              onValueChange={onToggleBiometric}
              disabled={biometric.loading}
              trackColor={{ true: theme.primary }}
            />
          </ThemedView>
        </ThemedView>

        <SettingsRow label="Change Login PIN" onPress={() => router.push('/change-pin')} />
        <SettingsRow label="Security Recovery Code" onPress={() => router.push('/recovery-code')} />

        <PrimaryButton title="Sign Out" onPress={onSignOut} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.two },
  row: { padding: Spacing.three, borderRadius: Spacing.two },
  biometricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
