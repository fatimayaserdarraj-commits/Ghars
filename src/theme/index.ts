import { Platform } from 'react-native';

/**
 * Ghars design tokens — "sage glass": deep forest-green surfaces, frosted glass cards
 * and soft sage accents, with a serif display face for headings.
 */
export const colors = {
  bg: '#1C2A22',
  bgAlt: '#2A3D32',
  surface: 'rgba(255,255,255,0.06)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.11)',
  text: '#EEF2EA',
  textDim: 'rgba(238,242,234,0.70)',
  textFaint: 'rgba(238,242,234,0.45)',
  primary: '#A8C69A', // sage
  primaryDeep: '#6E8F62',
  lime: '#C9DDB0', // pale sage highlight
  mint: '#A9CDB8',
  sun: '#E3C98A',
  coral: '#DDA08F',
  sky: '#A9C3D2',
  violet: '#BDB2D8',
  danger: '#E07A6E',
  /** Text and icons placed on light sage surfaces (buttons, active chips). */
  onPrimary: '#1C2B22',
} as const;

export const gradients = {
  screen: ['#33493B', '#22322A', '#18241D'] as const,
  primary: ['#CFE0B8', '#93B27F'] as const,
  lime: ['#DDE9CB', '#AFC89A'] as const,
  sun: ['#EBDDB4', '#C8B07C'] as const,
  coral: ['#E8C2B4', '#C3907F'] as const,
  sky: ['#C3D6E0', '#8FAEC0'] as const,
  violet: ['#D3CCE6', '#A398C4'] as const,
  mint: ['#C7DFD0', '#8DB89F'] as const,
  glass: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)'] as const,
  /** Dark frosted hero cards. */
  deep: ['#3C5745', '#26382D'] as const,
};

export type GradientName = keyof typeof gradients;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const font = {
  display: Platform.select({ ios: 'System', default: undefined }),
  /** Serif used for headings (Latin script only — Arabic falls back to the system face). */
  serif: 'PlayfairDisplay_600SemiBold',
  serifRegular: 'PlayfairDisplay_500Medium',
  sizes: { xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, hero: 36 },
} as const;

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 6 },
  default: {},
});
