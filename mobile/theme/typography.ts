import type { TextStyle } from 'react-native';

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as TextStyle['fontWeight'] },
  h1:      { fontSize: 24, fontWeight: '700' as TextStyle['fontWeight'] },
  h2:      { fontSize: 20, fontWeight: '600' as TextStyle['fontWeight'] },
  body:    { fontSize: 16, fontWeight: '400' as TextStyle['fontWeight'] },
  caption: { fontSize: 13, fontWeight: '400' as TextStyle['fontWeight'] },
  button:  { fontSize: 16, fontWeight: '600' as TextStyle['fontWeight'] },
} as const;
