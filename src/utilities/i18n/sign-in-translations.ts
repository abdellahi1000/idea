import type { Language } from '@/utilities/local-preferences';

export type SignInTranslationKey =
  | 'welcomeBack'
  | 'loginWithPhone'
  | 'loginWithEmail'
  | 'phoneNumber'
  | 'loginPin'
  | 'email'
  | 'password'
  | 'login'
  | 'forgotPassword'
  | 'forgotPin'
  | 'noAccountSignUp';

export const LANGUAGE_LABELS: Record<Language, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
};

export const SIGN_IN_TRANSLATIONS: Record<Language, Record<SignInTranslationKey, string>> = {
  en: {
    welcomeBack: 'Welcome back',
    loginWithPhone: 'Login with Phone Number',
    loginWithEmail: 'Login with Email',
    phoneNumber: 'Phone Number',
    loginPin: 'Login PIN',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    forgotPassword: 'Forgot Password?',
    forgotPin: 'Forgot Login PIN?',
    noAccountSignUp: "Don't have an account? Sign Up",
  },
  fr: {
    welcomeBack: 'Bon retour',
    loginWithPhone: 'Connexion par numéro de téléphone',
    loginWithEmail: 'Connexion par e-mail',
    phoneNumber: 'Numéro de téléphone',
    loginPin: 'Code PIN de connexion',
    email: 'E-mail',
    password: 'Mot de passe',
    login: 'Connexion',
    forgotPassword: 'Mot de passe oublié ?',
    forgotPin: 'Code PIN oublié ?',
    noAccountSignUp: "Vous n'avez pas de compte ? Inscrivez-vous",
  },
  ar: {
    welcomeBack: 'مرحباً بعودتك',
    loginWithPhone: 'الدخول برقم الهاتف',
    loginWithEmail: 'الدخول بالبريد الإلكتروني',
    phoneNumber: 'رقم الهاتف',
    loginPin: 'الرقم السري',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'دخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    forgotPin: 'نسيت الرقم السري؟',
    noAccountSignUp: 'مستخدم جديد؟ سجل الآن',
  },
};
