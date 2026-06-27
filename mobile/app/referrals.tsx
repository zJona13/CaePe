import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Gift, Share2 } from 'lucide-react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useReferralsMe } from '../lib/queries/referrals';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function Referrals() {
  const referrals = useReferralsMe();
  const data = referrals.data;
  const [copied, setCopied] = useState(false);

  const shareMessage = (link: string, days: number) =>
    `¡Cae con CaePe! 🎉 Arma salidas, divide la cuenta y confirma pagos sin chamba. ` +
    `Únete con mi link y cuando armes tu primer plan, yo gano ${days} días de Premium 🙌\n${link}`;

  const onShare = async () => {
    if (!data) return;
    try {
      await Share.share({ message: shareMessage(data.link, data.reward_days) });
    } catch {
      /* el usuario canceló */
    }
  };

  const onCopy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Invita y gana" subtitle="Premium gratis por cada amigo que arme su plan" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {referrals.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
        ) : data ? (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Gift size={26} color={colors.onAccent} strokeWidth={2.4} />
              </View>
              <Text style={styles.heroTitle}>Gana {data.reward_days} días de Premium</Text>
              <Text style={styles.heroSub}>
                Por cada amigo que se una con tu link y arme (y fondee) su primer evento.
              </Text>
            </View>

            {/* Código + link */}
            <Text style={styles.sectionTitle}>Tu código</Text>
            <View style={styles.codeCard}>
              <Text style={styles.code}>{data.referral_code}</Text>
              <Pressable onPress={onCopy} style={styles.copyBtn} hitSlop={8}>
                {copied ? (
                  <>
                    <Check size={16} color={colors.successDark} strokeWidth={2.6} />
                    <Text style={[styles.copyText, { color: colors.successDark }]}>Copiado</Text>
                  </>
                ) : (
                  <>
                    <Copy size={16} color={colors.primary} strokeWidth={2.4} />
                    <Text style={styles.copyText}>Copiar link</Text>
                  </>
                )}
              </Pressable>
            </View>

            <PrimaryButton
              label="Compartir mi link"
              onPress={onShare}
              icon={<Share2 size={18} color={colors.onPrimary} strokeWidth={2.6} />}
            />

            {/* Progreso */}
            <Text style={styles.sectionTitle}>Tus referidos</Text>
            <View style={styles.statsRow}>
              <Stat label="Invitados" value={data.pending + data.qualified + data.rewarded} />
              <Stat label="Premios" value={data.rewarded} highlight />
            </View>
            <Text style={styles.footnote}>
              El premio se activa cuando tu amigo fondea su primer evento. Aplica un tope anual y
              controles anti-abuso.
            </Text>
          </>
        ) : (
          <Text style={styles.footnote}>No pudimos cargar tus referidos. Inténtalo más tarde.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHi]}>
      <Text style={[styles.statValue, highlight && { color: colors.primaryDark }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },

  hero: {
    backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg,
    gap: 6, ...shadows.elevated,
  },
  heroIcon: {
    width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.accentDark,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroTitle: { ...typography.h1, color: colors.onAccent },
  heroSub: { ...typography.body, color: colors.onAccent },

  sectionTitle: { ...typography.h2, color: colors.primaryDark, marginTop: spacing.lg },

  codeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  code: { ...typography.display, color: colors.textPrimary, letterSpacing: 3 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { ...typography.bodyBold, color: colors.primary },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  statCardHi: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  statValue: { ...typography.display, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },

  footnote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
});
