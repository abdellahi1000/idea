import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="send-money" options={{ title: 'Send money' }} />
      <Stack.Screen name="receive-money" options={{ title: 'Receive money' }} />
      <Stack.Screen name="personal-info" options={{ title: 'Personal information' }} />
      <Stack.Screen name="change-pin" options={{ title: 'Change login PIN' }} />
      <Stack.Screen name="recovery-code" options={{ title: 'Security recovery code' }} />
      <Stack.Screen name="devices" options={{ title: 'Devices' }} />
      <Stack.Screen name="identity-verification" options={{ title: 'Identity verification' }} />
      <Stack.Screen name="transactions/[id]" options={{ title: 'Transaction details' }} />
    </Stack>
  );
}
