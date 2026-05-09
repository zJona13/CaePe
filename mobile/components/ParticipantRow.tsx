import { StyleSheet, Text, View } from 'react-native';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SLANG } from '../lib/slang';

const AVATAR_PALETTE = ['#14B8C4', '#7C3AED', '#A8E232', '#FF8A4C', '#0EA5E9', '#EC4899', '#F59E0B', '#22C55E'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

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
  const bg = avatarColor(name || initial);
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {isOrganizer && (
            <View style={styles.organizerTag}>
              <Text style={styles.organizerText}>organiza</Text>
            </View>
          )}
        </View>
        <PaymentStatusBadge status={status} />
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>S/ {amountDue}</Text>
        {showMarkButton && status === 'pending' && onMarkPaid ? (
          <View style={{ marginTop: spacing.xs }}>
            <PrimaryButton variant="accent" size="sm" fullWidth={false} label={SLANG.ctaMarkPaid} onPress={onMarkPaid} loading={marking} />
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
    ...shadows.card,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  body: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { ...typography.bodyBold, color: colors.textPrimary },
  organizerTag: { backgroundColor: colors.secondarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  organizerText: { fontSize: 11, fontWeight: '700', color: colors.secondary, letterSpacing: 0.3 },
  right: { alignItems: 'flex-end' },
  amount: { ...typography.h3, color: colors.textPrimary },
});
