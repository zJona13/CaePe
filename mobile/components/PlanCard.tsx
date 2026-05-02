import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
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

const CATEGORY_LABELS: Record<string, string> = {
  comida: 'Comida',
  deporte: 'Deporte',
  fiesta: 'Fiesta',
  cultura: 'Cultura',
  aire_libre: 'Aire libre',
  otros: 'Otros',
};

export function PlanCard({ plan, selected, onPress }: Props) {
  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{plan.name}</Text>
        <View style={styles.chip}><Text style={styles.chipText}>{CATEGORY_LABELS[plan.category] ?? plan.category}</Text></View>
      </View>
      {plan.location ? (
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={styles.location}>{plan.location}</Text>
        </View>
      ) : null}
      {plan.description ? (
        <Text style={styles.description} numberOfLines={2}>{plan.description}</Text>
      ) : null}
      <Text style={styles.price}>S/ {plan.price_min} – S/ {plan.price_max}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.h2, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  chip: { backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  location: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.body, color: colors.textSecondary },
  price: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
});
