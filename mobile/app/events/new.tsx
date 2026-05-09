import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PlanCard } from '../../components/PlanCard';
import { useGroups } from '../../lib/queries/groups';
import { useCreateEvent, type CreateEventBody } from '../../lib/queries/events';
import { usePlans } from '../../lib/queries/plans';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Participant = { name: string; phone?: string };

type FormValues = {
  group_id: string;
  plan_id?: string;
  name: string;
  date: Date | null;
  time: Date | null;
  location: string;
  total_budget: string;
  participants: Participant[];
};

function calcAmount(total: string, n: number): string {
  const t = Number(total);
  if (!t || !n) return '0.00';
  return (Math.round((t / n) * 100) / 100).toFixed(2);
}

function LiveAmount({ control }: { control: Control<FormValues> }) {
  const total = useWatch({ control, name: 'total_budget' });
  const participants = useWatch({ control, name: 'participants' });
  const n = participants.length || 1;
  return (
    <View style={styles.amountCard}>
      <Text style={styles.amountLabel}>Monto por persona</Text>
      <Text style={styles.amount}>S/ {calcAmount(total ?? '0', n)}</Text>
      <Text style={styles.amountMeta}>{n} {n === 1 ? 'persona' : 'personas'}</Text>
    </View>
  );
}

export default function NewEvent() {
  const params = useLocalSearchParams<{ groupId?: string; planId?: string; people?: string }>();
  const groups = useGroups();
  const plans = usePlans();
  const createEvent = useCreateEvent();

  const selectedPlan = useMemo(
    () => plans.data?.find((p) => p.id === params.planId),
    [plans.data, params.planId],
  );

  const initialGroupId = params.groupId ?? groups.data?.[0]?.id ?? '';
  const initialParticipants: Participant[] = params.people
    ? Array.from({ length: Math.max(1, Number(params.people)) }, () => ({ name: '' }))
    : [{ name: '' }];

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      group_id: initialGroupId,
      plan_id: params.planId,
      name: selectedPlan?.name ?? '',
      date: null,
      time: null,
      location: selectedPlan?.location ?? '',
      total_budget: '',
      participants: initialParticipants,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'participants' });
  const watchedGroupId = useWatch({ control, name: 'group_id' });

  useEffect(() => {
    if (selectedPlan) {
      setValue('name', selectedPlan.name);
      setValue('location', selectedPlan.location ?? '');
    }
  }, [selectedPlan, setValue]);

  useEffect(() => {
    if (!params.groupId && groups.data && groups.data.length > 0) {
      setValue('group_id', groups.data[0].id);
    }
  }, [groups.data, params.groupId, setValue]);

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitErr(null);
    try {
      const body: CreateEventBody = {
        group_id: values.group_id,
        plan_id: values.plan_id || undefined,
        name: values.name,
        date: values.date ? values.date.toISOString().slice(0, 10) : null,
        time: values.time ? values.time.toTimeString().slice(0, 8) : null,
        location: values.location || null,
        total_budget: values.total_budget,
        participants: values.participants.filter((p) => p.name.trim()),
      };
      const created = await createEvent.mutateAsync(body);
      router.replace({ pathname: '/events/[id]/summary', params: { id: created.id } });
    } catch (e) {
      setSubmitErr((e as Error).message);
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}>
        <Text style={styles.title}>{SLANG.ctaCreateEvent}</Text>

        {selectedPlan && <PlanCard plan={selectedPlan} />}

        <Text style={styles.label}>Nombre del evento</Text>
        <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
          render={({ field: { value, onChange } }) => (
            <TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
          )}
        />
        {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}

        <Text style={styles.label}>Fecha</Text>
        <Controller control={control} name="date" render={({ field: { value, onChange } }) => (
          <>
            <Pressable style={styles.input} onPress={() => setShowDate(true)}>
              <Text style={{ color: value ? colors.textPrimary : colors.textSecondary }}>
                {value ? value.toLocaleDateString('es-PE') : 'Seleccionar fecha'}
              </Text>
            </Pressable>
            {showDate && (
              <DateTimePicker
                value={value ?? new Date()}
                mode="date"
                onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) onChange(d); }}
              />
            )}
          </>
        )} />

        <Text style={styles.label}>Hora</Text>
        <Controller control={control} name="time" render={({ field: { value, onChange } }) => (
          <>
            <Pressable style={styles.input} onPress={() => setShowTime(true)}>
              <Text style={{ color: value ? colors.textPrimary : colors.textSecondary }}>
                {value ? value.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'Seleccionar hora'}
              </Text>
            </Pressable>
            {showTime && (
              <DateTimePicker
                value={value ?? new Date()}
                mode="time"
                onChange={(_, d) => { setShowTime(Platform.OS === 'ios'); if (d) onChange(d); }}
              />
            )}
          </>
        )} />

        <Text style={styles.label}>Lugar</Text>
        <Controller control={control} name="location" render={({ field: { value, onChange } }) => (
          <TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )} />

        <Text style={styles.label}>Presupuesto total (S/)</Text>
        <Controller control={control} name="total_budget" rules={{ required: 'Presupuesto requerido' }}
          render={({ field: { value, onChange } }) => (
            <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.input} placeholderTextColor={colors.textSecondary} />
          )}
        />
        {errors.total_budget && <Text style={styles.err}>{errors.total_budget.message}</Text>}

        <LiveAmount control={control} />

        <Text style={styles.label}>Participantes</Text>
        {fields.map((f, i) => (
          <View key={f.id} style={styles.partRow}>
            <Controller control={control} name={`participants.${i}.name`}
              rules={{ required: 'Nombre' }}
              render={({ field: { value, onChange } }) => (
                <TextInput placeholder={`Participante ${i + 1}`} value={value} onChangeText={onChange} style={[styles.input, { flex: 1 }]} placeholderTextColor={colors.textSecondary} />
              )}
            />
            {fields.length > 1 && (
              <Pressable onPress={() => remove(i)} style={styles.removeBtn}><Text style={styles.removeText}>×</Text></Pressable>
            )}
          </View>
        ))}
        <Pressable onPress={() => append({ name: '' })} style={styles.addBtn}>
          <Text style={styles.addText}>{SLANG.ctaAddParticipant}</Text>
        </Pressable>

        {submitErr && <Text style={styles.err}>{submitErr}</Text>}
        {!watchedGroupId && <Text style={styles.err}>Crea un grupo primero.</Text>}

        <PrimaryButton label={SLANG.ctaConfirmEvent} onPress={onSubmit} loading={createEvent.isPending} disabled={!watchedGroupId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  amountCard: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', gap: spacing.xs },
  amountLabel: { ...typography.caption, color: colors.textPrimary },
  amount: { ...typography.display, color: colors.textPrimary },
  amountMeta: { ...typography.caption, color: colors.textSecondary },
  err: { color: colors.error, ...typography.caption },
  partRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  removeBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.surface, fontSize: 22, lineHeight: 22 },
  addBtn: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center' },
  addText: { color: colors.primary, ...typography.button },
});
