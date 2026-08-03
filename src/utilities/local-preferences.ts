import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'jojo.language';
const LAST_AUTH_METHOD_KEY = 'jojo.last_auth_method';
const LAST_EMAIL_KEY = 'jojo.last_email';
const LAST_PHONE_KEY = 'jojo.last_phone';

export type Language = 'ar' | 'fr' | 'en';
export type AuthMethod = 'email' | 'phone';

export const localPreferences = {
  getLanguage: (): Promise<Language | null> => AsyncStorage.getItem(LANGUAGE_KEY) as Promise<Language | null>,
  setLanguage: (language: Language): Promise<void> => AsyncStorage.setItem(LANGUAGE_KEY, language),

  getLastAuthMethod: (): Promise<AuthMethod | null> =>
    AsyncStorage.getItem(LAST_AUTH_METHOD_KEY) as Promise<AuthMethod | null>,

  getLastEmail: (): Promise<string | null> => AsyncStorage.getItem(LAST_EMAIL_KEY),
  getLastPhone: (): Promise<string | null> => AsyncStorage.getItem(LAST_PHONE_KEY),

  async rememberLastLogin(method: AuthMethod, identifier: string): Promise<void> {
    await AsyncStorage.setItem(LAST_AUTH_METHOD_KEY, method);
    await AsyncStorage.setItem(method === 'email' ? LAST_EMAIL_KEY : LAST_PHONE_KEY, identifier);
  },
};
