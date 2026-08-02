import { Redirect } from 'expo-router';

import { useSessionStore } from '@/features/auth/hooks/use-session';

export default function Index() {
  const session = useSessionStore((state) => state.session);
  return <Redirect href={session ? '/home' : '/sign-in'} />;
}
