import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { updateMe } from '../../lib/queries/auth';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function PersonalInfo() {
  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  const setSession = useSession((s) => s.setSession);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user || !token) return null;

  const onSave = async () => {
    setSaving(true); setErr(null);
    try {
      if (!name.trim()) throw new Error('Nombre requerido');
      if (phone && !/^\d{9}$/.test(phone)) throw new Error('Teléfono: 9 dígitos');
      const updated = await updateMe({ name: name.trim(), phone: phone || null }, token);
      setSession(updated, token);
      router.back();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.title}>Información personal</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardScreen>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Input
          label="Nombre completo"
          placeholder="Ej. Ana García"
          iconLeft={<User size={20} color={colors.primary} strokeWidth={2} />}
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Correo electrónico"
          value={user.email}
          editable={false}
          iconLeft={<Mail size={20} color={colors.textMuted} strokeWidth={2} />}
          helper="No se puede cambiar"
        />

        <Input
          label="Número de teléfono"
          placeholder="987654321"
          keyboardType="number-pad"
          maxLength={9}
          iconLeft={<Phone size={20} color={colors.primary} strokeWidth={2} />}
          value={phone}
          onChangeText={setPhone}
          helper="Usaremos este número para Yape/Plin"
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton size="lg" label={SLANG.ctaSave} onPress={onSave} loading={saving} />
        </View>
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h3, color: colors.textPrimary },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  err: { ...typography.caption, color: colors.error, textAlign: 'center' },
});
