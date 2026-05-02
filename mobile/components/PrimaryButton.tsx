import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: ReactNode;
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', icon }: Props) {
  const isDisabled = disabled || loading;
  const styleByVariant = stylesByVariant[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styleByVariant.container,
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styleByVariant.spinner} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, styleByVariant.label]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.button },
});

const stylesByVariant: Record<Variant, { container: object; label: object; spinner: string }> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    label: { color: colors.surface },
    spinner: colors.surface,
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    label: { color: colors.surface },
    spinner: colors.surface,
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    label: { color: colors.primary },
    spinner: colors.primary,
  },
};
