export const colors = {
  primary: '#FF6B35',
  secondary: '#2EC4B6',
  accent: '#FFB627',
  success: '#06D6A0',
  error: '#EF476F',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  background: '#FFF8F0',
  surface: '#FFFFFF',
  border: '#E8E8E8',
  overlay: 'rgba(26,26,46,0.5)',
  badgePendingBg: '#FFF4E6',
  badgePaidBg: '#E6FBF4',
} as const;

export type ColorKey = keyof typeof colors;
