import { Platform } from 'react-native';

export const fontFamily = {
  regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
  medium:  Platform.OS === 'ios' ? 'System' : 'Roboto',
  bold:    Platform.OS === 'ios' ? 'System' : 'Roboto',
};

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

export const fontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

export const lineHeight = {
  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
};
