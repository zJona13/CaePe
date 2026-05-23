import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchMe } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardScreen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="CaePe"
          />
          <Text style={styles.title}>¡Hola de nuevo!</Text>
          <Text style={styles.subtitle}>Ingresa a tu cuenta para seguir organizando tus planes.</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={{ required: 'Email requerido' }}
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Correo Electrónico"
                  placeholder="ejemplo@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  iconLeft={<Mail size={20} color={colors.primary} strokeWidth={2} />}
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
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  iconLeft={<Lock size={20} color={colors.primary} strokeWidth={2} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <Pressable onPress={() => { /* TODO: flujo de recuperación */ }} hitSlop={8} style={styles.forgotWrap}>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <PrimaryButton
              size="lg"
              label={SLANG.ctaSignIn}
              onPress={onSubmit}
              loading={loading}
              icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2.4} />}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
              <Text style={styles.footerLink}>Regístrate</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.elevated,
  },
  logo: { width: 84, height: 84 },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', maxWidth: 260, marginTop: -spacing.xs },
  form: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.md },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -spacing.xs },
  forgot: { ...typography.captionBold, color: colors.primaryDark, letterSpacing: 0 },
  err: { ...typography.caption, color: colors.error, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border, alignSelf: 'stretch', marginVertical: spacing.sm },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodyBold, color: colors.primaryDark },
});
