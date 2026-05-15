import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  helper?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, helper, style, iconLeft, iconRight, ...rest },
  ref,
) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.primaryMuted}
          style={[styles.input, iconLeft ? styles.inputWithIcon : null, style]}
          {...rest}
        />
        {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...typography.bodyMedium, color: colors.textPrimary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
  },
  fieldError: { borderColor: colors.error },
  iconLeft: { paddingLeft: spacing.md, paddingRight: spacing.sm },
  iconRight: { paddingLeft: spacing.sm, paddingRight: spacing.md },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputWithIcon: { paddingLeft: 0 },
  err: { ...typography.caption, color: colors.error },
  helper: { ...typography.caption, color: colors.textSecondary },
});
