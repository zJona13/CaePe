import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
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
      setError((e as Error).message);
    } finally { setLoading(false); }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{SLANG.ctaCreateAccount}</Text>

      <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="nombre" value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}

      <Controller control={control} name="email" rules={{ required: 'Email requerido' }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="email" keyboardType="email-address" autoCapitalize="none"
            value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.email && <Text style={styles.err}>{errors.email.message}</Text>}

      <Controller control={control} name="password" rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6' } }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="contraseña" secureTextEntry value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.password && <Text style={styles.err}>{errors.password.message}</Text>}

      <Text style={styles.label}>Método de pago</Text>
      <Controller control={control} name="payment_method"
        render={({ field: { value, onChange } }) => (
          <View style={styles.chipsRow}>
            {(['yape', 'plin'] as const).map((m) => (
              <Pressable key={m} onPress={() => onChange(m)}
                style={[styles.chip, value === m && styles.chipActive]}>
                <Text style={[styles.chipText, value === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Controller control={control} name="payment_number"
        rules={{ required: 'Número requerido', pattern: { value: /^\d{9}$/, message: '9 dígitos' } }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="número (9 dígitos)" keyboardType="number-pad" maxLength={9}
            value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.payment_number && <Text style={styles.err}>{errors.payment_number.message}</Text>}

      {error && <Text style={styles.err}>{error}</Text>}

      <PrimaryButton label={SLANG.ctaCreateAccount} onPress={onSubmit} loading={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body,
  },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontWeight: '600' },
  chipTextActive: { color: colors.surface },
  err: { color: colors.error, ...typography.caption },
});
