import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { provisionAccount } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = {
  name: string;
  email: string;
  password: string;
  payment_method: 'yape' | 'plin';
  payment_number: string;
};

function getRegisterErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta';
  if (message.toLowerCase().includes('email signups are disabled')) {
    return 'El registro con email está desactivado en Supabase. Activa el proveedor Email y deja apagada la confirmación de email.';
  }
  return message;
}

export default function Register() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', email: '', password: '', payment_method: 'yape', payment_number: '' },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useSession((s) => s.setSession);

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signUp({ email: values.email, password: values.password });
      if (e || !data.session) throw new Error(e?.message ?? 'Sin sesión tras signUp (¿confirmar email habilitado?)');
      const token = data.session.access_token;
      const user = await provisionAccount({
        email: values.email,
        name: values.name,
        payment_method: values.payment_method,
        payment_number: values.payment_number,
      }, token);
      setSession(user, token);
      router.replace('/(tabs)/home');
    } catch (e) {
      setError(getRegisterErrorMessage(e));
    } finally { setLoading(false); }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={SLANG.ctaCreateAccount} subtitle="Listo en 30 segundos" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
          render={({ field: { value, onChange } }) => (
            <Input label="Nombre" placeholder="Tu nombre" value={value} onChangeText={onChange} error={errors.name?.message} />
          )}
        />

        <Controller control={control} name="email" rules={{ required: 'Email requerido' }}
          render={({ field: { value, onChange } }) => (
            <Input label="Email" placeholder="tu@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" value={value} onChangeText={onChange} error={errors.email?.message} />
          )}
        />

        <Controller control={control} name="password" rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6 caracteres' } }}
          render={({ field: { value, onChange } }) => (
            <Input label="Contraseña" placeholder="Mínimo 6 caracteres" secureTextEntry autoComplete="new-password" textContentType="newPassword" value={value} onChangeText={onChange} error={errors.password?.message} />
          )}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Método de pago</Text>
          <Controller control={control} name="payment_method"
            render={({ field: { value, onChange } }) => (
              <View style={styles.chipsRow}>
                {(['yape', 'plin'] as const).map((m) => (
                  <Pressable key={m} onPress={() => onChange(m)}
                    style={({ pressed }) => [
                      styles.chip,
                      value === m && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.chipText, value === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>

        <Controller control={control} name="payment_number"
          rules={{ required: 'Número requerido', pattern: { value: /^\d{9}$/, message: '9 dígitos' } }}
          render={({ field: { value, onChange } }) => (
            <Input
              label="Número (9 dígitos)"
              placeholder="987654321"
              keyboardType="number-pad"
              maxLength={9}
              value={value}
              onChangeText={onChange}
              error={errors.payment_number?.message}
              helper="Lo verán solo los participantes de tus eventos"
            />
          )}
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label={SLANG.ctaCreateAccount} onPress={onSubmit} loading={loading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  field: { gap: 6 },
  label: { ...typography.captionBold, color: colors.textPrimary, textTransform: 'uppercase' },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.bodyBold, color: colors.textPrimary, letterSpacing: 0.5 },
  chipTextActive: { color: colors.onPrimary },
  err: { ...typography.caption, color: colors.error, textAlign: 'center' },
});
