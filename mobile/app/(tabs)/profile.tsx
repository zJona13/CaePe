import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
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
      // Backend has no /auth update endpoint per Fase 2; persist locally as MVP.
      setSession({ ...user, payment_method: method, payment_number: num }, token);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user.name ?? user.email)?.charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.name}>{user.name ?? '(sin nombre)'}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Text style={styles.label}>Método de pago</Text>
      <View style={styles.chipsRow}>
        {(['yape', 'plin'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMethod(m)} style={[styles.chip, method === m && styles.chipActive]}>
            <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Número (9 dígitos)</Text>
      <TextInput value={num} onChangeText={setNum} keyboardType="number-pad" maxLength={9} style={styles.input} placeholderTextColor={colors.textSecondary} />

      {err && <Text style={styles.err}>{err}</Text>}

      <PrimaryButton variant="secondary" label={SLANG.ctaSave} onPress={onSave} loading={saving} />

      <View style={{ flex: 1 }} />

      <PrimaryButton variant="ghost" label={SLANG.ctaLogout} onPress={onLogout} icon={<LogOut color={colors.primary} size={18} />} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  name: { ...typography.h2, color: colors.textPrimary },
  email: { ...typography.caption, color: colors.textSecondary },
  label: { ...typography.caption, color: colors.textSecondary },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontWeight: '600' },
  chipTextActive: { color: colors.surface },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  err: { color: colors.error, ...typography.caption },
});
