import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Check, Clock, MapPin, Users, Wallet } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { PlanCard } from '../../components/PlanCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useGroups, useGroupMembers, type GroupMember } from '../../lib/queries/groups';
import { useCreateEvent, type CreateEventBody } from '../../lib/queries/events';
import { usePlans } from '../../lib/queries/plans';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = {
  group_id: string;
  plan_id?: string;
  name: string;
  date: Date | null;
  time: Date | null;
  location: string;
  total_budget: string;
  member_user_ids: string[];
};

function calcAmount(total: string, n: number): string {
  const t = Number(total);
  if (!t || !n) return '0.00';
  return (Math.round((t / n) * 100) / 100).toFixed(2);
}

function LiveAmount({ control, organizerId }: { control: Control<FormValues>; organizerId: string | undefined }) {
  const total = useWatch({ control, name: 'total_budget' });
  const ids = useWatch({ control, name: 'member_user_ids' });
  const set = new Set(ids ?? []);
  if (organizerId) set.add(organizerId);
  const n = Math.max(set.size, 1);
  return (
    <View style={styles.amountCard}>
      <View style={styles.amountBlob} />
      <View style={styles.amountContent}>
        <Text style={styles.amountLabel}>Monto por persona</Text>
        <Text style={styles.amount}>S/ {calcAmount(total ?? '0', n)}</Text>
        <Text style={styles.amountMeta}>{n} {n === 1 ? 'persona' : 'personas'} · presupuesto S/ {total || '0'}</Text>
      </View>
    </View>
  );
}

export default function NewEvent() {
  const params = useLocalSearchParams<{ groupId?: string; planId?: string }>();
  const session = useSession((s) => s.user);
  const groups = useGroups();
  const plans = usePlans();
  const createEvent = useCreateEvent();

  const selectedPlan = useMemo(
    () => plans.data?.find((p) => p.id === params.planId),
    [plans.data, params.planId],
  );

  const initialGroupId = params.groupId ?? groups.data?.[0]?.id ?? '';

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      group_id: initialGroupId,
      plan_id: params.planId,
      name: selectedPlan?.name ?? '',
      date: null,
      time: null,
      location: selectedPlan?.location ?? '',
      total_budget: '',
      member_user_ids: [],
    },
  });

  const watchedGroupId = useWatch({ control, name: 'group_id' });
  const watchedIds = useWatch({ control, name: 'member_user_ids' });
  const members = useGroupMembers(watchedGroupId || undefined);

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

  const toggleMember = (uid: string) => {
    const set = new Set(watchedIds ?? []);
    if (set.has(uid)) set.delete(uid); else set.add(uid);
    setValue('member_user_ids', Array.from(set));
  };

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
        member_user_ids: values.member_user_ids,
      };
      const created = await createEvent.mutateAsync(body);
      router.replace({ pathname: '/events/[id]/summary', params: { id: created.id } });
    } catch (e) {
      setSubmitErr((e as Error).message);
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={SLANG.ctaCreateEvent} subtitle="Llena lo básico, calculamos el monto al toque" />
      <KeyboardScreen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {selectedPlan ? <PlanCard plan={selectedPlan} /> : null}

        <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
          render={({ field: { value, onChange } }) => (
            <Input label="Nombre del evento" placeholder="Ej. Sábado parrilla" value={value} onChangeText={onChange} error={errors.name?.message} />
          )}
        />

        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Fecha</Text>
            <Controller control={control} name="date" render={({ field: { value, onChange } }) => (
              <>
                <Pressable
                  style={({ pressed }) => [styles.pickerInput, pressed && { opacity: 0.85 }]}
                  onPress={() => setShowDate(true)}
                >
                  <Calendar size={18} color={colors.primary} strokeWidth={2.4} />
                  <Text style={[styles.pickerText, { color: value ? colors.textPrimary : colors.textMuted }]}>
                    {value ? value.toLocaleDateString('es-PE') : 'Seleccionar'}
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
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hora</Text>
            <Controller control={control} name="time" render={({ field: { value, onChange } }) => (
              <>
                <Pressable
                  style={({ pressed }) => [styles.pickerInput, pressed && { opacity: 0.85 }]}
                  onPress={() => setShowTime(true)}
                >
                  <Clock size={18} color={colors.primary} strokeWidth={2.4} />
                  <Text style={[styles.pickerText, { color: value ? colors.textPrimary : colors.textMuted }]}>
                    {value ? value.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'Seleccionar'}
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
          </View>
        </View>

        <Controller control={control} name="location" render={({ field: { value, onChange } }) => (
          <View>
            <Text style={styles.label}>Lugar</Text>
            <View style={styles.iconInputWrap}>
              <MapPin size={18} color={colors.textMuted} strokeWidth={2.2} style={styles.iconInputIcon} />
              <Input value={value} onChangeText={onChange} placeholder="Dónde se arma" style={{ paddingLeft: 42 }} />
            </View>
          </View>
        )} />

        <Controller control={control} name="total_budget" rules={{ required: 'Presupuesto requerido' }}
          render={({ field: { value, onChange } }) => (
            <View>
              <Text style={styles.label}>Presupuesto total (S/)</Text>
              <View style={styles.iconInputWrap}>
                <Wallet size={18} color={colors.textMuted} strokeWidth={2.2} style={styles.iconInputIcon} />
                <Input value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.00" style={{ paddingLeft: 42 }} error={errors.total_budget?.message} />
              </View>
            </View>
          )}
        />

        <LiveAmount control={control} organizerId={session?.id} />

        <View style={styles.membersHeader}>
          <Users size={18} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.label}>Miembros del grupo</Text>
        </View>
        <Text style={styles.hint}>Marca quiénes van. Tú quedas incluido. Comparte el link luego para que más se sumen.</Text>

        {members.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
        ) : (
          <View style={{ gap: spacing.xs }}>
            {(members.data ?? []).filter((m: GroupMember) => m.user_id && m.user_id !== session?.id).map((m) => {
              const uid = m.user_id as string;
              const selected = (watchedIds ?? []).includes(uid);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggleMember(uid)}
                  style={({ pressed }) => [
                    styles.memberRow,
                    selected && styles.memberRowSelected,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected ? <Check size={14} color={colors.surface} strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name ?? m.email ?? 'Sin nombre'}</Text>
                    {m.phone ? <Text style={styles.memberMeta}>{m.phone}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            {((members.data ?? []).filter((m) => m.user_id && m.user_id !== session?.id).length === 0) ? (
              <Text style={styles.empty}>Aún no hay otros miembros. Crea el evento y comparte el link para invitarlos.</Text>
            ) : null}
          </View>
        )}

        {submitErr ? <Text style={styles.err}>{submitErr}</Text> : null}
        {!watchedGroupId ? <Text style={styles.err}>Crea un grupo primero.</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton label={SLANG.ctaConfirmEvent} onPress={onSubmit} loading={createEvent.isPending} disabled={!watchedGroupId} />
        </View>
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  label: { ...typography.captionBold, color: colors.textPrimary, textTransform: 'uppercase', marginBottom: 6 },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.xs },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  pickerInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.border, minHeight: 50 },
  pickerText: { ...typography.body },

  iconInputWrap: { position: 'relative' },
  iconInputIcon: { position: 'absolute', left: spacing.md, top: 16, zIndex: 1 },

  amountCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden', ...shadows.elevated, marginVertical: spacing.sm },
  amountBlob: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.accent, opacity: 0.7, top: -80, right: -60 },
  amountContent: { gap: 4, alignItems: 'center' },
  amountLabel: { ...typography.captionBold, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  amount: { ...typography.amount, color: colors.surface },
  amountMeta: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },

  membersHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  memberRowSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  memberName: { ...typography.bodyBold, color: colors.textPrimary },
  memberMeta: { ...typography.caption, color: colors.textSecondary },
  empty: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', padding: spacing.md, textAlign: 'center' },

  err: { ...typography.caption, color: colors.error, textAlign: 'center' },
});
