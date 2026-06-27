import { useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellRing, Check, Coins, Crown, Infinity as InfinityIcon } from 'lucide-react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { openCheckout } from '../lib/checkout';
import {
  useBillingCatalog,
  useBillingMe,
  useCreditsCheckout,
  usePremiumCheckout,
  useRefreshBilling,
  type CreditPack,
} from '../lib/queries/billing';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

// Fallback si el catálogo aún no cargó (mismos precios que el backend).
const FALLBACK_PACKS: CreditPack[] = [
  { code: 'credits_10', credits: 10, price: '8.00', title: '10 créditos' },
  { code: 'credits_25', credits: 25, price: '15.00', title: '25 créditos' },
];
const FALLBACK_PREMIUM_PRICE = '9.90';

export default function Paywall() {
  const billing = useBillingMe();
  const catalog = useBillingCatalog();
  const creditsCheckout = useCreditsCheckout();
  const premiumCheckout = usePremiumCheckout();
  const refreshBilling = useRefreshBilling();
  const [busy, setBusy] = useState<string | null>(null); // pack.code | 'premium'

  const me = billing.data;
  const remaining = me?.events_remaining ?? null;
  const atLimit = me ? remaining === 0 && !me.is_premium : false;

  const packs = catalog.data?.credit_packs ?? FALLBACK_PACKS;
  const premiumPrice = catalog.data?.premium_price ?? FALLBACK_PREMIUM_PRICE;

  const runCheckout = async (key: string, getInitPoint: () => Promise<string>) => {
    if (busy) return;
    setBusy(key);
    try {
      const initPoint = await getInitPoint();
      const outcome = await openCheckout(initPoint);
      await refreshBilling();
      if (outcome === 'returned') {
        Alert.alert(
          '¡Gracias por tu compra! 🎉',
          'Estamos confirmando tu pago con Mercado Pago. Tu beneficio se activa en unos segundos.',
        );
      }
    } catch (e) {
      Alert.alert('No se pudo abrir el pago', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const buyCredits = (pack: CreditPack) =>
    runCheckout(pack.code, async () => (await creditsCheckout.mutateAsync(pack.code)).init_point);

  const buyPremium = () =>
    runCheckout('premium', async () => (await premiumCheckout.mutateAsync()).init_point);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Tu plan" subtitle="Crea más eventos cuando quieras" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {billing.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
        ) : (
          <>
            {/* Estado actual */}
            <View style={[styles.statusCard, atLimit && styles.statusCardLimit]}>
              <View style={styles.statusIcon}>
                <Crown size={22} color={me?.is_premium ? colors.onAccent : colors.primary} strokeWidth={2.4} />
              </View>
              {me?.is_premium ? (
                <>
                  <Text style={styles.statusTitle}>Plan Premium activo</Text>
                  <Text style={styles.statusMeta}>Eventos ilimitados. ¡A armar planes sin tope!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusTitle}>
                    {atLimit ? 'Llegaste al límite del plan gratis' : 'Plan Gratis'}
                  </Text>
                  <Text style={styles.statusMeta}>
                    {me ? `${me.events_created} de ${me.free_event_limit} eventos usados` : ''}
                    {me && me.event_credits > 0 ? ` · ${me.event_credits} créditos` : ''}
                  </Text>
                </>
              )}
            </View>

            {!me?.is_premium && (
              <>
                {/* Créditos */}
                <Text style={styles.sectionTitle}>Compra créditos</Text>
                <Text style={styles.sectionHint}>1 crédito = 1 evento extra. Sin vencimiento.</Text>
                <View style={{ gap: spacing.sm }}>
                  {packs.map((pack) => {
                    const loading = busy === pack.code;
                    return (
                      <Pressable
                        key={pack.code}
                        onPress={() => buyCredits(pack)}
                        disabled={!!busy}
                        style={({ pressed }) => [
                          styles.packCard,
                          pressed && { transform: [{ scale: 0.99 }] },
                          !!busy && !loading && { opacity: 0.5 },
                        ]}
                      >
                        <View style={styles.packIcon}>
                          <Coins size={20} color={colors.primary} strokeWidth={2.4} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.packTitle}>{pack.credits} créditos</Text>
                          <Text style={styles.packMeta}>{pack.credits} eventos extra</Text>
                        </View>
                        {loading ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          <Text style={styles.packPrice}>S/ {pack.price}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Premium */}
                <Text style={styles.sectionTitle}>O hazte Premium</Text>
                <View style={styles.premiumCard}>
                  <View style={styles.premiumBlob} />
                  <View style={styles.premiumHead}>
                    <Crown size={22} color={colors.onAccent} strokeWidth={2.6} />
                    <Text style={styles.premiumTitle}>Premium</Text>
                    <Text style={styles.premiumPrice}>S/ {premiumPrice}<Text style={styles.premiumPer}>/mes</Text></Text>
                  </View>
                  <View style={styles.benefit}>
                    <InfinityIcon size={16} color={colors.onAccent} strokeWidth={2.6} />
                    <Text style={styles.benefitText}>Eventos ilimitados</Text>
                  </View>
                  <View style={styles.benefit}>
                    <BellRing size={16} color={colors.onAccent} strokeWidth={2.6} />
                    <Text style={styles.benefitText}>Recordatorios automáticos de pago</Text>
                  </View>
                  <View style={styles.benefit}>
                    <Check size={16} color={colors.onAccent} strokeWidth={2.6} />
                    <Text style={styles.benefitText}>Renovación mensual, cancela cuando quieras</Text>
                  </View>
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  <PrimaryButton
                    variant="accent"
                    label="Hazte Premium"
                    onPress={buyPremium}
                    loading={busy === 'premium'}
                    disabled={!!busy && busy !== 'premium'}
                    icon={<Crown size={18} color={colors.onAccent} strokeWidth={2.6} />}
                  />
                </View>

                <Text style={styles.footnote}>
                  Pagas con tarjeta vía Mercado Pago. El pago se confirma al instante, sin que hagas nada más.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },

  statusCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: 6, ...shadows.card,
  },
  statusCardLimit: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  statusIcon: {
    width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statusTitle: { ...typography.h2, color: colors.textPrimary },
  statusMeta: { ...typography.caption, color: colors.textSecondary },

  sectionTitle: { ...typography.h2, color: colors.primaryDark, marginTop: spacing.lg },
  sectionHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },

  packCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  packIcon: {
    width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  packTitle: { ...typography.bodyBold, color: colors.textPrimary },
  packMeta: { ...typography.caption, color: colors.textSecondary },
  packPrice: { ...typography.h2, color: colors.primaryDark },

  premiumCard: {
    backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg,
    overflow: 'hidden', gap: spacing.sm, ...shadows.elevated,
  },
  premiumBlob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.accentDark, opacity: 0.35, top: -70, right: -50 },
  premiumHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  premiumTitle: { ...typography.h2, color: colors.onAccent, flex: 1 },
  premiumPrice: { ...typography.h2, color: colors.onAccent },
  premiumPer: { ...typography.caption, color: colors.onAccent },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { ...typography.body, color: colors.onAccent, flex: 1 },

  footnote: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
