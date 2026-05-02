import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Copy, MapPin } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useEvent } from '../../../lib/queries/events';
import { useSession } from '../../../lib/store';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const user = useSession((s) => s.user);

  useEffect(() => {
    if (event.data?.status === 'funded') {
      router.replace({ pathname: '/events/[id]/funded', params: { id } });
    }
  }, [event.data?.status, id]);

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;
  const isOrganizer = user?.id === e.organizer_id;
  const isGuest = !user;
  const payMethod = e.organizer_payment_method;
  const payNumber = e.organizer_payment_number;

  const copyNumber = async () => { if (payNumber) await Clipboard.setStringAsync(payNumber); };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{e.name}</Text>
        <Text style={styles.statusBadge}>{e.status}</Text>

        <View style={styles.metaRow}><Calendar size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.date ?? 'sin fecha'} {e.time ?? ''}</Text></View>
        {e.location && <View style={styles.metaRow}><MapPin size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.location}</Text></View>}

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto por persona</Text>
          <Text style={styles.amount}>S/ {e.amount_per_person}</Text>
        </View>

        {payMethod && payNumber ? (
          <View style={styles.payCard}>
            <Text style={styles.label}>Método de pago del organizador</Text>
            <Text style={styles.payMethod}>{payMethod.toUpperCase()}</Text>
            <View style={styles.payRow}>
              <Text style={styles.payNumber}>{payNumber}</Text>
              <Pressable onPress={copyNumber} style={styles.copyBtn}><Copy size={18} color={colors.primary} /></Pressable>
            </View>
            <Text style={styles.tooltip}>{SLANG.paymentExternal}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Participantes</Text>
        {e.participants.map((p) => (
          <ParticipantRow key={p.id} name={p.name} amountDue={p.amount_due} status={p.payment_status} />
        ))}

        {isGuest && (
          <PrimaryButton label={SLANG.ctaJoinCaepe} onPress={() => router.push('/(auth)/register')} />
        )}
        {isOrganizer && e.status !== 'funded' && (
          <>
            <PrimaryButton label={SLANG.ctaMarkPayments} onPress={() => router.push({ pathname: '/events/[id]/payments', params: { id } })} />
            <PrimaryButton variant="ghost" label="Editar" onPress={() => router.push({ pathname: '/events/new', params: { eventId: id } })} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  statusBadge: { ...typography.caption, color: colors.secondary, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.body, color: colors.textSecondary },
  amountCard: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  amountLabel: { ...typography.caption, color: colors.textPrimary },
  amount: { ...typography.display, color: colors.textPrimary },
  payCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary },
  payMethod: { ...typography.h2, color: colors.primary },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payNumber: { ...typography.h2, color: colors.textPrimary, letterSpacing: 2 },
  copyBtn: { padding: spacing.sm },
  tooltip: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
});
