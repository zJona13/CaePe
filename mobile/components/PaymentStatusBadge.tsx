import { StyleSheet, Text, View } from 'react-native';
import { Check, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { SLANG } from '../lib/slang';

type Props = { status: 'pending' | 'paid' };

export function PaymentStatusBadge({ status }: Props) {
  const isPaid = status === 'paid';
  const bg = isPaid ? colors.badgePaidBg : colors.badgePendingBg;
  const fg = isPaid ? colors.badgePaidText : colors.badgePendingText;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {isPaid ? <Check size={12} color={fg} strokeWidth={3} /> : <Clock size={12} color={fg} strokeWidth={2.5} />}
      <Text style={[styles.label, { color: fg }]}>
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
