import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/utilities/env';
import type { Database } from '@/types/database.types';

// Expo Router's web output renders on the server (Node) as well as the
// browser. AsyncStorage and AppState assume a browser/native runtime, so
// both must be skipped in the server render pass or this module throws
// `window is not defined` before it ever reaches the client.
const isServer = typeof window === 'undefined';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

if (!isServer) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
