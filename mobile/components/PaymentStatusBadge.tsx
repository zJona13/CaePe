import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { SLANG } from '../lib/slang';

type Props = { status: 'pending' | 'paid' };

export function PaymentStatusBadge({ status }: Props) {
  const isPaid = status === 'paid';
  return (
    <View style={[styles.badge, { backgroundColor: isPaid ? colors.badgePaidBg : colors.badgePendingBg }]}>
      {isPaid && <Check size={12} color={colors.success} />}
      <Text style={[styles.label, { color: isPaid ? colors.success : colors.primary }]}>
        {isPaid ? SLANG.badgePaid : SLANG.badgePending}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '600' },
});
