import { StyleSheet, Text, View } from 'react-native';
import { Check, Circle, Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';

type EventStatus = 'draft' | 'active' | 'funded' | 'cancelled';

const map: Record<EventStatus, { bg: string; fg: string; label: string; Icon: typeof Check | typeof Circle | typeof Sparkles }> = {
  draft:     { bg: colors.badgeDraftBg, fg: colors.badgeDraftText, label: 'Borrador', Icon: Circle },
  active:    { bg: colors.badgeActiveBg, fg: colors.badgeActiveText, label: 'Activo', Icon: Sparkles },
  funded:    { bg: colors.badgePaidBg, fg: colors.badgePaidText, label: 'Cayó', Icon: Check },
  cancelled: { bg: colors.errorSoft, fg: colors.error, label: 'Cancelado', Icon: Circle },
};

export function StatusBadge({ status }: { status: EventStatus | string }) {
  const key = (map[status as EventStatus] ? (status as EventStatus) : 'draft') as EventStatus;
  const m = map[key];
  const Icon = m.Icon;
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]}>
      <Icon size={12} color={m.fg} strokeWidth={2.5} />
      <Text style={[styles.label, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, alignSelf: 'flex-start' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
