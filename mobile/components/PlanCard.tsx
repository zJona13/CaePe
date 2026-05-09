import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Wallet } from 'lucide-react-native';
import { CategoryChip } from './CategoryChip';
import { categoryColors, colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export type PlanCardData = {
  name: string;
  category: string;
  price_min: number | string;
  price_max: number | string;
  location?: string | null;
  description?: string | null;
};

type Props = {
  plan: PlanCardData;
  selected?: boolean;
  onPress?: () => void;
};

export function PlanCard({ plan, selected, onPress }: Props) {
  const accent = categoryColors[plan.category] ?? categoryColors.otros;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { borderColor: selected ? accent.bg : 'transparent' },
          selected && { borderWidth: 2 },
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
        ]}
      >
        <CardBody plan={plan} accentColor={accent.bg} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, selected && { borderColor: accent.bg, borderWidth: 2 }]}>
      <CardBody plan={plan} accentColor={accent.bg} />
    </View>
  );
}

function CardBody({ plan, accentColor }: { plan: PlanCardData; accentColor: string }) {
  return (
    <>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{plan.name}</Text>
          <CategoryChip category={plan.category} />
        </View>
        {plan.location ? (
          <View style={styles.metaRow}>
            <MapPin size={14} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.meta}>{plan.location}</Text>
          </View>
        ) : null}
        {plan.description ? (
          <Text style={styles.description} numberOfLines={2}>{plan.description}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <Wallet size={16} color={accentColor} strokeWidth={2.5} />
          <Text style={[styles.price, { color: colors.textPrimary }]}>S/ {plan.price_min} – S/ {plan.price_max}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    ...shadows.card,
  },
  accentBar: { height: 6, width: '100%' },
  content: { padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h2, color: colors.textPrimary, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.body, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  price: { ...typography.bodyBold },
});
