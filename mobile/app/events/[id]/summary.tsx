import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin } from 'lucide-react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { useEvent } from '../../../lib/queries/events';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{e.name}</Text>
        <View style={styles.metaRow}><Calendar size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.date ?? 'sin fecha'} {e.time ?? ''}</Text></View>
        {e.location && <View style={styles.metaRow}><MapPin size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.location}</Text></View>}

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto por persona</Text>
          <Text style={styles.amount}>S/ {e.amount_per_person}</Text>
        </View>

        <Text style={styles.section}>Participantes</Text>
        {e.participants.map((p) => (
          <ParticipantRow key={p.id} name={p.name} amountDue={p.amount_due} status={p.payment_status} />
        ))}

        <PrimaryButton label={SLANG.ctaShare} onPress={() => router.push({ pathname: '/events/[id]/share', params: { id } })} />
        <PrimaryButton variant="ghost" label="Ver evento" onPress={() => router.replace({ pathname: '/events/[id]', params: { id } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.body, color: colors.textSecondary },
  amountCard: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: 16, alignItems: 'center' },
  amountLabel: { ...typography.caption, color: colors.textPrimary },
  amount: { ...typography.display, color: colors.textPrimary },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
});
