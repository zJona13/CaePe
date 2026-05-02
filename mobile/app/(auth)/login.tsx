import { router, Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchMe } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = { email: string; password: string };

export default function Login() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useSession((s) => s.setSession);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e || !data.session) throw new Error(e?.message ?? 'Sin sesión');
      const token = data.session.access_token;
      const user = await fetchMe(token);
      setSession(user, token);
      router.replace('/(tabs)/home');
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Entrar</Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: 'Email requerido' }}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            placeholder="email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        )}
      />
      {errors.email && <Text style={styles.err}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6 caracteres' } }}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            placeholder="contraseña"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        )}
      />
      {errors.password && <Text style={styles.err}>{errors.password.message}</Text>}

      {error && <Text style={styles.err}>{error}</Text>}

      <PrimaryButton label={SLANG.ctaEnter} onPress={onSubmit} loading={loading} />

      <Link href="/(auth)/register" style={styles.link}>¿Nuevo? Crear cuenta</Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body,
  },
  err: { color: colors.error, ...typography.caption },
  link: { color: colors.primary, marginTop: spacing.lg, textAlign: 'center', ...typography.body },
});
