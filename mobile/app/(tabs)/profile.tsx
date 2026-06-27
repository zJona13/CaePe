import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronRight, Crown, Gift, LogOut, Settings, User } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { unregisterPushToken } from '../../lib/notifications';
import { useBillingMe } from '../../lib/queries/billing';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function Profile() {
  const user = useSession((s) => s.user);
  const setSession = useSession((s) => s.setSession);
  const clearSession = useSession((s) => s.clearSession);
  const token = useSession((s) => s.token);
  const billing = useBillingMe();

  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<'yape' | 'plin'>(user?.payment_method ?? 'yape');
  const [num, setNum] = useState(user?.payment_number ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user || !token) return null;

  const onSave = async () => {
    setSaving(true); setErr(null);
    try {
      setSession({ ...user, payment_method: method, payment_number: num }, token);
      setEditing(false);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const onLogout = async () => {
    await unregisterPushToken();
    await supabase.auth.signOut();
    clearSession();
    router.replace('/(auth)/onboarding');
  };

  const displayName = user.name ?? user.email.split('@')[0];
  const initial = displayName.charAt(0).toUpperCase();
  const currentMethod = user.payment_method ?? 'yape';
  const currentNumber = user.payment_number ?? '';
  const formattedNumber = currentNumber ? `+51 ${currentNumber.slice(0, 3)} ${currentNumber.slice(3, 6)} ${currentNumber.slice(6)}` : 'Sin número';
  const methodLabel = currentMethod === 'yape' ? 'Yape' : 'Plin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardScreen>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Mi Perfil</Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
        </View>

        <Text style={styles.section}>Cuenta</Text>
        <Pressable
          onPress={() => router.push('/profile/personal-info')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.rowIcon}>
            <User size={18} color={colors.textSecondary} strokeWidth={2.2} />
          </View>
          <Text style={styles.rowText}>Información personal</Text>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>

        <Text style={styles.section}>Plan</Text>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.rowIcon}>
            <Crown size={18} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>{billing.data?.is_premium ? 'Premium' : 'Plan Gratis'}</Text>
            {billing.data && !billing.data.is_premium ? (
              <Text style={styles.rowSub}>
                {billing.data.events_created}/{billing.data.free_event_limit} eventos
                {billing.data.event_credits > 0 ? ` · ${billing.data.event_credits} créditos` : ''}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/referrals')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.rowIcon}>
            <Gift size={18} color={colors.accent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>Invita y gana Premium</Text>
            <Text style={styles.rowSub}>Días gratis por cada amigo que arme su plan</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>

        <Text style={styles.section}>Pagos</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEyebrow}>MÉTODO ACTUAL</Text>
            <View style={styles.badge}>
              <Check size={12} color={colors.successDark} strokeWidth={2.6} />
              <Text style={styles.badgeText}>Activo</Text>
            </View>
          </View>

          <View style={styles.methodRow}>
            <View style={styles.methodAvatar}>
              <Text style={styles.methodAvatarText}>{methodLabel.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.methodName}>{methodLabel}</Text>
              <Text style={styles.methodMeta}>{formattedNumber}</Text>
            </View>
          </View>

          {editing ? (
            <View style={{ gap: spacing.md }}>
              <View style={styles.chipsRow}>
                {(['yape', 'plin'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    style={({ pressed }) => [
                      styles.chip,
                      method === m && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m === 'yape' ? 'Yape' : 'Plin'}</Text>
                  </Pressable>
                ))}
              </View>
              <Input
                label="Número (9 dígitos)"
                value={num}
                onChangeText={setNum}
                keyboardType="number-pad"
                maxLength={9}
                placeholder="987654321"
                error={err}
              />
              <PrimaryButton label={SLANG.ctaSave} onPress={onSave} loading={saving} />
            </View>
          ) : (
            <PrimaryButton
              variant="ghost"
              label="Configurar método"
              onPress={() => setEditing(true)}
              icon={<Settings size={18} color={colors.primary} strokeWidth={2.4} />}
            />
          )}
        </View>

        <View style={{ height: spacing.lg }} />
        <PrimaryButton
          variant="ghost"
          label={SLANG.ctaLogout}
          onPress={onLogout}
          icon={<LogOut color={colors.primary} size={18} strokeWidth={2.4} />}
        />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md },

  screenTitle: { ...typography.bodyBold, color: colors.textPrimary, textAlign: 'center' },

  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  avatar: {
    width: 96, height: 96, borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.display, color: colors.primaryDark },
  name: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },

  section: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEyebrow: { ...typography.captionBold, color: colors.textSecondary, letterSpacing: 0.6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.badgePaidBg,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { ...typography.captionBold, color: colors.successDark },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  methodAvatar: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  methodAvatarText: { ...typography.h2, color: colors.onSecondary },
  methodName: { ...typography.bodyBold, color: colors.textPrimary },
  methodMeta: { ...typography.caption, color: colors.textSecondary },

  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.bodyBold, color: colors.textPrimary },
  chipTextActive: { color: colors.onPrimary },
});
