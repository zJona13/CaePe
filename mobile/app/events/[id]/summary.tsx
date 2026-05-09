import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, CheckCircle2, Clock, MapPin, Share2 } from 'lucide-react-native';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useEvent } from '../../../lib/queries/events';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { shadows } from '../../../theme/shadows';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.successRow}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={24} color={colors.accentDark} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>¡Evento creado!</Text>
            <Text style={styles.successSub}>Comparte y mete a tu mancha</Text>
          </View>
        </View>

        <Text style={styles.title}>{e.name}</Text>

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
            <Text style={styles.amountMeta}>{e.participants.length} {e.participants.length === 1 ? 'persona' : 'personas'}</Text>
          </View>
        </View>

        <Text style={styles.section}>Participantes</Text>
        <View style={{ gap: spacing.sm }}>
          {e.participants.map((p) => (
            <ParticipantRow key={p.id} name={p.name} amountDue={p.amount_due} status={p.payment_status} />
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={SLANG.ctaShare}
            onPress={() => router.push({ pathname: '/events/[id]/share', params: { id } })}
            icon={<Share2 size={18} color={colors.onPrimary} strokeWidth={2.5} />}
          />
          <PrimaryButton variant="ghost" label="Ver evento" onPress={() => router.replace({ pathname: '/events/[id]', params: { id } })} />
        </View>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.accentSoft, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent },
  successIcon: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  successTitle: { ...typography.h3, color: colors.textPrimary },
  successSub: { ...typography.caption, color: colors.textSecondary },

  title: { ...typography.h1, color: colors.textPrimary },

  metaList: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { ...typography.body, color: colors.textSecondary },

  amountCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden', ...shadows.elevated },
  amountBlob: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accent, opacity: 0.6, top: -80, right: -70 },
  amountContent: { gap: 4, alignItems: 'center' },
  amountLabel: { ...typography.captionBold, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  amount: { ...typography.amount, color: colors.surface },
  amountMeta: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },

  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
