import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Users } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCreateGroup, type Group } from '../../lib/queries/groups';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = { name: string };

export default function NewGroup() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: '' } });
  const createGroup = useCreateGroup();
  const [created, setCreated] = useState<Group | null>(null);

  const onSubmit = handleSubmit(async ({ name }) => {
    const g = await createGroup.mutateAsync(name);
    setCreated(g);
  });

  const shareWhatsapp = async (group: Group) => {
    const code = group.invite_code;
    const link = `caepe://groups/join/${code}`;
    const msg =
      `¡Habla! Únete a mi grupo "${group.name}" en CaePe 🎉\n\n` +
      `📲 Si ya tienes la app, abre: ${link}\n` +
      `🔑 O entra a CaePe y mete el código: ${code}`;
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try { await Linking.openURL(url); } catch { /* ignore */ }
  };

  if (created) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader />
        <View style={styles.body}>
          <View style={styles.successIconWrap}>
            <View style={styles.successRing} />
            <View style={styles.successIcon}><Check size={48} color={colors.surface} strokeWidth={3} /></View>
          </View>
          <Text style={styles.successTitle}>¡Grupo armado!</Text>
          <Text style={styles.successBody}>Comparte el código y mete a la mancha</Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Código de invitación</Text>
            <Text style={styles.code}>{created.invite_code}</Text>
            <Text style={styles.codeHelper}>{created.name}</Text>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label={SLANG.ctaShare} onPress={() => shareWhatsapp(created)} />
            <PrimaryButton variant="ghost" label="Ir al grupo" onPress={() => router.replace({ pathname: '/groups/[id]', params: { id: created.id } })} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Nuevo grupo" subtitle="Junta a tu mancha en un toque" />
      <KeyboardScreen>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.heroIcon}>
          <Users size={48} color={colors.secondary} strokeWidth={2.2} />
        </View>

        <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
          render={({ field: { value, onChange } }) => (
            <Input
              label="Nombre del grupo"
              placeholder="Ej. Los broders, Familia, Trabajo..."
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />
        {createGroup.isError ? <Text style={styles.err}>{SLANG.errorGeneric}</Text> : null}

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label={SLANG.ctaCreateGroup} onPress={onSubmit} loading={createGroup.isPending} />
        </View>
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md, alignItems: 'stretch' },
  heroIcon: { alignSelf: 'center', width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.secondarySoft, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg },
  err: { ...typography.caption, color: colors.error, textAlign: 'center' },

  successIconWrap: { width: 140, height: 140, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  successRing: { position: 'absolute', width: 140, height: 140, borderRadius: radius.full, backgroundColor: colors.accentSoft },
  successIcon: { width: 100, height: 100, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...shadows.elevated },
  successTitle: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
  successBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  codeCard: { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius.lg, gap: spacing.xs, alignItems: 'center', borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', marginVertical: spacing.lg },
  codeLabel: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase' },
  code: { fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: 6 },
  codeHelper: { ...typography.caption, color: colors.textSecondary },
  actions: { gap: spacing.sm },
});
