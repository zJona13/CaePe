import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'text' | 'danger';

type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', size = 'md', icon, fullWidth = true }: Props) {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        s.container,
        v.container,
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && styles.disabled,
        pressed && !isDisabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[typography.button, s.label, { color: v.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.45 },
});

const sizeStyles: Record<Size, { container: object; label: object }> = {
  sm: { container: { paddingVertical: 10, paddingHorizontal: spacing.md, minHeight: 40 }, label: { fontSize: 14 } },
  md: { container: { paddingVertical: 14, paddingHorizontal: spacing.lg, minHeight: 50 }, label: {} },
  lg: { container: { paddingVertical: 18, paddingHorizontal: spacing.lg, minHeight: 58 }, label: { fontSize: 17 } },
};

const variantStyles: Record<Variant, { container: object; fg: string; spinner: string }> = {
  primary: {
    container: { backgroundColor: colors.primary, ...shadows.floating },
    fg: colors.onPrimary,
    spinner: colors.onPrimary,
  },
  accent: {
    container: { backgroundColor: colors.accent, ...shadows.card },
    fg: colors.onAccent,
    spinner: colors.onAccent,
  },
  secondary: {
    container: { backgroundColor: colors.secondary, ...shadows.card },
    fg: colors.onSecondary,
    spinner: colors.onSecondary,
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
    fg: colors.primary,
    spinner: colors.primary,
  },
  text: {
    container: { backgroundColor: 'transparent' },
    fg: colors.primaryDark,
    spinner: colors.primaryDark,
  },
  danger: {
    container: { backgroundColor: colors.error },
    fg: '#FFFFFF',
    spinner: '#FFFFFF',
  },
};
