import { router, Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { fetchMe } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Bienvenido de vuelta" subtitle="Entra y sigue armando planes" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="email"
          rules={{ required: 'Email requerido' }}
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Email"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6 caracteres' } }}
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Contraseña"
              placeholder="••••••"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton label={SLANG.ctaEnter} onPress={onSubmit} loading={loading} />
          <Link href="/(auth)/register" style={styles.link}>¿Nuevo en CaePe? Crea tu cuenta</Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  err: { ...typography.caption, color: colors.error, textAlign: 'center' },
  link: { ...typography.bodyMedium, color: colors.primary, textAlign: 'center' },
});
