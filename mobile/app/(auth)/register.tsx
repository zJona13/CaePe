import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, CreditCard, Eye, EyeOff, Gift, Lock, Mail, Phone, User } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getDeviceHash } from '../../lib/device';
import { provisionAccount } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type PaymentMethod = 'yape' | 'plin';

type FormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  payment_method: PaymentMethod;
  referral_code: string;
};

function getRegisterErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta';
  if (message.toLowerCase().includes('email signups are disabled')) {
    return 'El registro con email está desactivado en Supabase. Activa el proveedor Email y deja apagada la confirmación de email.';
  }
  return message;
}

export default function Register() {
  const params = useLocalSearchParams<{ ref?: string }>();
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', email: '', phone: '', password: '', payment_method: 'yape',
      referral_code: (params.ref ?? '').toString().toUpperCase(),
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const setSession = useSession((s) => s.setSession);

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signUp({ email: values.email, password: values.password });
      if (e || !data.session) throw new Error(e?.message ?? 'Sin sesión tras signUp (¿confirmar email habilitado?)');
      const token = data.session.access_token;
      const referral = values.referral_code.trim().toUpperCase();
      const user = await provisionAccount({
        email: values.email,
        name: values.name,
        phone: values.phone,
        payment_method: values.payment_method,
        payment_number: values.phone,
        referral_code: referral || null,
        device_hash: referral ? await getDeviceHash() : null,
      }, token);
      setSession(user, token);
      router.replace('/(tabs)/home');
    } catch (e) {
      setError(getRegisterErrorMessage(e));
    } finally { setLoading(false); }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardScreen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoFrame}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="CaePe"
            />
          </View>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete a tus amigos y simplifica los gastos compartidos.</Text>

          <View style={styles.form}>
            <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Nombre completo"
                  placeholder="Ej. Ana García"
                  iconLeft={<User size={20} color={colors.primary} strokeWidth={2} />}
                  value={value}
                  onChangeText={onChange}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller control={control} name="email" rules={{ required: 'Email requerido' }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Correo electrónico"
                  placeholder="ana@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  iconLeft={<Mail size={20} color={colors.primary} strokeWidth={2} />}
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller control={control} name="phone"
              rules={{ required: 'Teléfono requerido', pattern: { value: /^\d{9}$/, message: '9 dígitos' } }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Número de teléfono"
                  placeholder="987 654 321"
                  keyboardType="number-pad"
                  maxLength={9}
                  iconLeft={<Phone size={20} color={colors.primary} strokeWidth={2} />}
                  value={value}
                  onChangeText={onChange}
                  error={errors.phone?.message}
                  helper="Usaremos este número para Yape/Plin"
                />
              )}
            />

            <Controller control={control} name="password" rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6 caracteres' } }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Contraseña"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  iconLeft={<Lock size={20} color={colors.primary} strokeWidth={2} />}
                  iconRight={
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                      {showPassword
                        ? <Eye size={20} color={colors.textMuted} strokeWidth={2} />
                        : <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />}
                    </Pressable>
                  }
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller control={control} name="payment_method"
              render={({ field: { value, onChange } }) => (
                <View style={styles.pmWrap}>
                  <Text style={styles.pmLabel}>Método de pago principal</Text>
                  <PaymentOption method="yape" selected={value === 'yape'} onPress={() => onChange('yape')} />
                  <PaymentOption method="plin" selected={value === 'plin'} onPress={() => onChange('plin')} />
                </View>
              )}
            />

            <Controller control={control} name="referral_code"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Código de invitación (opcional)"
                  placeholder="Ej. A1B2C3D4"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  iconLeft={<Gift size={20} color={colors.accent} strokeWidth={2} />}
                  value={value}
                  onChangeText={(t) => onChange(t.toUpperCase())}
                  helper="¿Un amigo te invitó? Ingresa su código"
                />
              )}
            />

            <View style={styles.termsRow}>
              <Pressable
                onPress={() => setAccepted((a) => !a)}
                hitSlop={12}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                accessibilityLabel="Acepto los Términos y Condiciones"
                style={[styles.checkbox, accepted && styles.checkboxChecked]}
              >
                {accepted ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
              </Pressable>
              <Text style={styles.termsText}>
                Acepto los{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/(auth)/terms')}>
                  Términos y Condiciones
                </Text>
              </Text>
            </View>

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <PrimaryButton size="lg" label="Crear cuenta" onPress={onSubmit} loading={loading} disabled={!accepted} />
          </View>

          <View style={styles.divider} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

function PaymentOption({ method, selected, onPress }: { method: PaymentMethod; selected: boolean; onPress: () => void }) {
  const label = method === 'yape' ? 'Yape' : 'Plin';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pmCard,
        selected && styles.pmCardSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.pmIcon, selected && styles.pmIconSelected]}>
        <CreditCard size={20} color={selected ? colors.primary : colors.textSecondary} strokeWidth={2} />
      </View>
      <Text style={[styles.pmText, selected && styles.pmTextSelected]}>{label}</Text>
      <View style={[styles.pmRadio, selected && styles.pmRadioSelected]}>
        {selected ? <View style={styles.pmRadioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.elevated,
  },
  logoFrame: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  logo: { width: 52, height: 52 },
  title: { ...typography.h1, color: colors.primaryDark, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },
  form: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.md },
  pmWrap: { gap: spacing.sm },
  pmLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  pmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  pmCardSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 },
  pmIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  pmIconSelected: { backgroundColor: colors.surface },
  pmText: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  pmTextSelected: { color: colors.primaryDark },
  pmRadio: {
    width: 22, height: 22, borderRadius: radius.full,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  pmRadioSelected: { borderColor: colors.primary },
  pmRadioDot: { width: 12, height: 12, borderRadius: radius.full, backgroundColor: colors.primary },
  err: { ...typography.caption, color: colors.error, textAlign: 'center' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  termsLink: { ...typography.bodyBold, color: colors.primaryDark },
  divider: { height: 1, backgroundColor: colors.border, alignSelf: 'stretch', marginVertical: spacing.sm },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodyBold, color: colors.primaryDark },
});
