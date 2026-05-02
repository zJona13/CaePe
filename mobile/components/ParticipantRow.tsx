import { StyleSheet, Text, View } from 'react-native';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SLANG } from '../lib/slang';

type Props = {
  name: string;
  amountDue: number | string;
  status: 'pending' | 'paid';
  isOrganizer?: boolean;
  showMarkButton?: boolean;
  onMarkPaid?: () => void;
  marking?: boolean;
};

export function ParticipantRow({ name, amountDue, status, isOrganizer, showMarkButton, onMarkPaid, marking }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={styles.row}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {isOrganizer && <Text style={styles.organizerTag}>organizador</Text>}
        </View>
        <PaymentStatusBadge status={status} />
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>S/ {amountDue}</Text>
        {showMarkButton && status === 'pending' && onMarkPaid ? (
          <View style={{ marginTop: spacing.xs }}>
            <PrimaryButton variant="secondary" label={SLANG.ctaMarkPaid} onPress={onMarkPaid} loading={marking} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.textPrimary },
  body: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  organizerTag: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
  right: { alignItems: 'flex-end' },
  amount: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
});
