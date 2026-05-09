import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Wallet } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { PrimaryButton } from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
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

  const [method, setMethod] = useState<'yape' | 'plin'>(user?.payment_method ?? 'yape');
  const [num, setNum] = useState(user?.payment_number ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user || !token) return null;

  const onSave = async () => {
    setSaving(true); setErr(null);
    try {
      setSession({ ...user, payment_method: method, payment_number: num }, token);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    router.replace('/(auth)/onboarding');
  };

  const initial = (user.name ?? user.email)?.charAt(0).toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing} />
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          </View>
          <Text style={styles.name}>{user.name ?? '(sin nombre)'}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Wallet size={18} color={colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.cardTitle}>Método de pago</Text>
          </View>

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
                <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
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

          <PrimaryButton variant="primary" label={SLANG.ctaSave} onPress={onSave} loading={saving} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md },
  header: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  avatarWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarRing: { position: 'absolute', width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.accent, transform: [{ rotate: '-12deg' }], opacity: 0.8 },
  avatar: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.floating },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.onPrimary },
  name: { ...typography.h2, color: colors.textPrimary },
  email: { ...typography.caption, color: colors.textSecondary },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3, color: colors.textPrimary },

  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.bodyBold, color: colors.textPrimary, letterSpacing: 0.5 },
  chipTextActive: { color: colors.onPrimary },
});
