import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellRing, CheckCircle2, Lock } from 'lucide-react-native';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProofViewerModal } from '../../../components/ProofViewerModal';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useEvent } from '../../../lib/queries/events';
import { resolveProofUrl, useMarkPayment, useSendReminder } from '../../../lib/queries/payments';
import { useSession } from '../../../lib/store';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Payments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const mark = useMarkPayment(id ?? '');
  const reminder = useSendReminder(id ?? '');
  const user = useSession((s) => s.user);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('');

  const openProof = (proofUrl: string | null | undefined, name: string) => {
    const uri = resolveProofUrl(proofUrl);
    if (!uri) return;
    setViewerTitle(`Comprobante · ${name}`);
    setViewerUri(uri);
  };

  const onRemind = async () => {
    try {
      const res = await reminder.mutateAsync();
      Alert.alert(
        'Recordatorio enviado',
        res.notified > 0
          ? `Avisamos a ${res.notified} ${res.notified === 1 ? 'persona' : 'personas'} con pago pendiente.`
          : 'No hay pagos pendientes con la app instalada.',
      );
    } catch (e) {
      Alert.alert('No se pudo enviar', (e as Error).message);
    }
  };

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;
  const isOrganizer = user?.id === e.organizer_id;

  if (!isOrganizer) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.lockIcon}><Lock size={32} color={colors.error} strokeWidth={2.4} /></View>
        <Text style={styles.errTitle}>Solo el organizador</Text>
        <Text style={styles.errBody}>Solo el organizador puede marcar pagos.</Text>
      </SafeAreaView>
    );
  }

  const paidCount = e.participants.filter((p) => p.payment_status === 'paid').length;
  const totalCount = e.participants.length;
  const progress = totalCount > 0 ? paidCount / totalCount : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={SLANG.ctaMarkPayments} subtitle={e.name} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <View style={styles.progressBlob} />
          <View style={styles.progressContent}>
            <View style={styles.progressTop}>
              <CheckCircle2 size={20} color={colors.surface} strokeWidth={2.5} />
              <Text style={styles.progressTitle}>{paidCount} de {totalCount} pagaron</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressHint}>Marca cada cuota cuando llegue a tu Yape o Plin</Text>
          </View>
        </View>

        {paidCount < totalCount ? (
          <PrimaryButton
            variant="ghost"
            label="Recordar pago a los pendientes"
            onPress={onRemind}
            loading={reminder.isPending}
            icon={<BellRing size={16} color={colors.primary} strokeWidth={2.5} />}
          />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          {e.participants.map((p) => {
            const hasProof = p.has_proof;
            return (
              <ParticipantRow
                key={p.id}
                name={p.name}
                amountDue={p.amount_due}
                status={p.payment_status}
                isOrganizer={p.user_id === e.organizer_id}
                showMarkButton
                onMarkPaid={() => mark.mutate({ participantId: p.id, status: 'paid' })}
                marking={mark.isPending && mark.variables?.participantId === p.id}
                hasProof={hasProof}
                onViewProof={p.proof_image_url ? () => openProof(p.proof_image_url, p.name) : undefined}
              />
            );
          })}
        </View>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ProofViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        title={viewerTitle}
        onClose={() => setViewerUri(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.sm },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  progressCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden', ...shadows.elevated, marginBottom: spacing.sm },
  progressBlob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.accent, opacity: 0.65, top: -60, right: -50 },
  progressContent: { gap: spacing.sm },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTitle: { ...typography.h2, color: colors.surface },
  progressBarBg: { width: '100%', height: 10, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.full },
  progressHint: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },

  lockIcon: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  errTitle: { ...typography.h2, color: colors.textPrimary },
  errBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
