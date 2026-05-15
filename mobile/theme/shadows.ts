import type { ViewStyle } from 'react-native';

export const shadows: Record<'card' | 'elevated' | 'floating', ViewStyle> = {
  card: {
    shadowColor: '#0F1B3D',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0F1B3D',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#FF8775',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
};
