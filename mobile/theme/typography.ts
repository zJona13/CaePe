import type { TextStyle } from 'react-native';

type T = TextStyle;

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as T['fontWeight'], letterSpacing: -0.5, lineHeight: 40 },
  h1:      { fontSize: 26, fontWeight: '800' as T['fontWeight'], letterSpacing: -0.3, lineHeight: 32 },
  h2:      { fontSize: 20, fontWeight: '700' as T['fontWeight'], lineHeight: 26 },
  h3:      { fontSize: 17, fontWeight: '700' as T['fontWeight'], lineHeight: 22 },
  body:    { fontSize: 16, fontWeight: '400' as T['fontWeight'], lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500' as T['fontWeight'], lineHeight: 24 },
  bodyBold:   { fontSize: 16, fontWeight: '700' as T['fontWeight'], lineHeight: 24 },
  caption:   { fontSize: 13, fontWeight: '500' as T['fontWeight'], lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '700' as T['fontWeight'], lineHeight: 18, letterSpacing: 0.3 },
  button:    { fontSize: 16, fontWeight: '700' as T['fontWeight'], letterSpacing: 0.2 },
  amount:    { fontSize: 40, fontWeight: '800' as T['fontWeight'], letterSpacing: -0.5, lineHeight: 44 },
} as const;
