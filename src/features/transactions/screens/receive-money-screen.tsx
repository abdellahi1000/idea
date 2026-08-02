import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Alert, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/features/profile/hooks/use-profile';

export function ReceiveMoneyScreen() {
  const { data: profile, isLoading } = useProfile();

  const onCopy = async () => {
    if (!profile?.phone) return;
    await Clipboard.setStringAsync(profile.phone);
    Alert.alert('Copied', 'Your account number has been copied.');
  };

  const onShare = async () => {
    if (!profile?.phone) return;
    await Share.share({ message: `Send me money on JOJO: ${profile.phone}` });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Receive money</ThemedText>

        {isLoading || !profile?.phone ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText type="subtitle">{profile.phone}</ThemedText>

            <ThemedView style={styles.actions}>
              <PrimaryButton title="Copy Number" onPress={onCopy} />
              <PrimaryButton title="Share Account" onPress={onShare} />
            </ThemedView>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four, padding: Spacing.four },
  actions: { gap: Spacing.two, alignSelf: 'stretch' },
});
