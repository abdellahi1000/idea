/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#12201A',
    background: '#FFFFFF',
    backgroundElement: '#F5F7F6',
    backgroundSelected: '#E9F1EC',
    textSecondary: '#5B6B63',
    primary: '#0F7A4E',
    primaryPressed: '#0B5C3C',
    primarySoft: '#E6F4EC',
    accent: '#F5B914',
    accentText: '#7A5300',
    danger: '#D92D20',
  },
  dark: {
    text: '#F2F5F3',
    background: '#0B1410',
    backgroundElement: '#16211B',
    backgroundSelected: '#1E2C24',
    textSecondary: '#9BB0A4',
    primary: '#22A06B',
    primaryPressed: '#1B7F56',
    primarySoft: '#122A20',
    accent: '#F5C544',
    accentText: '#3A2900',
    danger: '#F04438',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
