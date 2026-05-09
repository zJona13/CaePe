import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  icon: ReactNode;
  title: string;
  body?: string;
  tint?: 'primary' | 'accent' | 'secondary';
};

export function EmptyState({ icon, title, body, tint = 'primary' }: Props) {
  const bg = tint === 'accent' ? colors.accentSoft : tint === 'secondary' ? colors.secondarySoft : colors.primarySoft;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
