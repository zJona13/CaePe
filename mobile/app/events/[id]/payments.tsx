import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { useEvent } from '../../../lib/queries/events';
import { useMarkPayment } from '../../../lib/queries/payments';
import { useSession } from '../../../lib/store';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Payments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const mark = useMarkPayment(id ?? '');
  const user = useSession((s) => s.user);

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;
  const isOrganizer = user?.id === e.organizer_id;

  if (!isOrganizer) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.err}>Solo el organizador puede marcar pagos.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={styles.title}>{SLANG.ctaMarkPayments}</Text>
        <Text style={styles.meta}>{e.name}</Text>

        {e.participants.map((p) => (
          <ParticipantRow
            key={p.id}
            name={p.name}
            amountDue={p.amount_due}
            status={p.payment_status}
            isOrganizer={p.user_id === e.organizer_id}
            showMarkButton
            onMarkPaid={() => mark.mutate({ participantId: p.id, status: 'paid' })}
            marking={mark.isPending && mark.variables?.participantId === p.id}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  err: { color: colors.error, ...typography.body },
});
