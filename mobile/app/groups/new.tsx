import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useCreateGroup, type Group } from '../../lib/queries/groups';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
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
    const link = `caepe://groups/join/${group.invite_code}`;
    const msg = `¡Habla! Únete a mi collera "${group.name}" en CaePe: ${link}`;
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try { await Linking.openURL(url); } catch { /* ignore */ }
  };

  if (created) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>¡Collera armada!</Text>
        <View style={styles.codeCard}>
          <Text style={styles.label}>Código de invitación</Text>
          <Text style={styles.code}>{created.invite_code}</Text>
        </View>
        <PrimaryButton label={SLANG.ctaShare} onPress={() => shareWhatsapp(created)} />
        <PrimaryButton variant="ghost" label="Ir a la collera" onPress={() => router.replace({ pathname: '/groups/[id]', params: { id: created.id } })} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Nueva collera</Text>
      <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="nombre de la collera" value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}
      {createGroup.isError && <Text style={styles.err}>{SLANG.errorGeneric}</Text>}

      <PrimaryButton label={SLANG.ctaCreateGroup} onPress={onSubmit} loading={createGroup.isPending} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  err: { color: colors.error, ...typography.caption },
  codeCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs, alignItems: 'center' },
  label: { ...typography.caption, color: colors.textSecondary },
  code: { ...typography.h1, color: colors.primary, letterSpacing: 4 },
});
