import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, CheckCircle2, Clock, Copy, MapPin, Pencil, Wallet } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProofViewerModal } from '../../../components/ProofViewerModal';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { useEvent } from '../../../lib/queries/events';
import { resolveProofUrl, useUploadProof } from '../../../lib/queries/payments';
import { useSession } from '../../../lib/store';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const user = useSession((s) => s.user);
  const uploadProof = useUploadProof(id ?? '');
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('');

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

  const pickAndUpload = async (participantId: string, amount: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir el comprobante.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      await uploadProof.mutateAsync({
        eventId: id!,
        participantId,
        amount,
        fileUri: asset.uri,
        fileName: asset.fileName ?? 'proof.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    } catch (err) {
      Alert.alert('No se pudo subir', (err as Error).message);
    }
  };

  const openProof = (proofUrl: string | null | undefined, name: string) => {
    const uri = resolveProofUrl(proofUrl);
    if (!uri) return;
    setViewerTitle(`Comprobante · ${name}`);
    setViewerUri(uri);
  };

  const paidCount = e.participants.filter((p) => p.payment_status === 'paid').length;
  const totalCount = e.participants.length;
  const progress = totalCount > 0 ? paidCount / totalCount : 0;

  const copyNumber = async () => { if (payNumber) await Clipboard.setStringAsync(payNumber); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{e.name}</Text>
          <StatusBadge status={e.status} />
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Calendar size={16} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.meta}>{e.date ?? 'sin fecha'}</Text>
            {e.time ? (
              <>
                <Clock size={16} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.meta}>{e.time}</Text>
              </>
            ) : null}
          </View>
          {e.location ? (
            <View style={styles.metaRow}>
              <MapPin size={16} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.meta}>{e.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.amountCard}>
          <View style={styles.amountBlob} />
          <View style={styles.amountContent}>
            <Text style={styles.amountLabel}>Monto por persona</Text>
            <Text style={styles.amount}>S/ {e.amount_per_person}</Text>
            <View style={styles.progressRow}>
              <CheckCircle2 size={14} color={colors.surface} strokeWidth={2.5} />
              <Text style={styles.progressText}>{paidCount} de {totalCount} pagaron</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </View>

        {payMethod && payNumber ? (
          <View style={styles.payCard}>
            <View style={styles.payHeader}>
              <Wallet size={18} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.payHeaderText}>Pago al organizador</Text>
            </View>
            <Text style={styles.payMethod}>{payMethod.toUpperCase()}</Text>
            <View style={styles.payRow}>
              <Text style={styles.payNumber}>{payNumber}</Text>
              <Pressable
                onPress={copyNumber}
                style={({ pressed }) => [styles.copyBtn, pressed && { transform: [{ scale: 0.93 }] }]}
                hitSlop={8}
              >
                <Copy size={18} color={colors.primary} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Text style={styles.tooltip}>{SLANG.paymentExternal}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Participantes</Text>
        <Text style={styles.sectionHint}>Encuentra tu nombre y sube tu comprobante de Yape/Plin.</Text>
        <View style={{ gap: spacing.sm }}>
          {e.participants.map((p) => {
            const hasProof = !!p.proof_image_url;
            const canUpload = p.payment_status === 'pending';
            return (
              <ParticipantRow
                key={p.id}
                name={p.name}
                amountDue={p.amount_due}
                status={p.payment_status}
                isOrganizer={p.user_id === e.organizer_id}
                hasProof={hasProof}
                onViewProof={hasProof ? () => openProof(p.proof_image_url, p.name) : undefined}
                onUploadProof={canUpload ? () => pickAndUpload(p.id, p.amount_due) : undefined}
                uploading={uploadProof.isPending && uploadProof.variables?.participantId === p.id}
              />
            );
          })}
        </View>

        <View style={styles.actions}>
          {isGuest ? (
            <PrimaryButton label={SLANG.ctaJoinCaepe} onPress={() => router.push('/(auth)/register')} />
          ) : null}
          {isOrganizer && e.status !== 'funded' ? (
            <>
              <PrimaryButton label={SLANG.ctaMarkPayments} onPress={() => router.push({ pathname: '/events/[id]/payments', params: { id } })} />
              <PrimaryButton
                variant="ghost"
                label="Editar"
                onPress={() => router.push({ pathname: '/events/new', params: { eventId: id } })}
                icon={<Pencil size={16} color={colors.primary} strokeWidth={2.5} />}
              />
            </>
          ) : null}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  titleRow: { gap: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },

  metaList: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { ...typography.body, color: colors.textSecondary },

  amountCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden', ...shadows.elevated },
  amountBlob: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accent, opacity: 0.6, top: -80, right: -70 },
  amountContent: { gap: spacing.xs, alignItems: 'center' },
  amountLabel: { ...typography.captionBold, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  amount: { ...typography.amount, color: colors.surface },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  progressText: { ...typography.captionBold, color: colors.surface },
  progressBarBg: { width: '100%', height: 8, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: spacing.xs },
  progressBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.full },

  payCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, ...shadows.card },
  payHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  payHeaderText: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase' },
  payMethod: { ...typography.h2, color: colors.primary },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md },
  payNumber: { ...typography.h2, color: colors.textPrimary, letterSpacing: 2 },
  copyBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tooltip: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },

  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.sm },
  sectionHint: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
