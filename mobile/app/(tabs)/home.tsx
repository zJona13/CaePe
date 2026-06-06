import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Calendar, Clock, Compass, MapPin, Plus, Sparkles, Users } from 'lucide-react-native';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatusBadge } from '../../components/StatusBadge';
import { useGroups, useJoinGroup, type Group } from '../../lib/queries/groups';
import { useEvents, type EventListItem } from '../../lib/queries/events';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function parseDatePill(date: string | null): { month: string; day: string } | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const monthIdx = Math.max(0, Math.min(11, parseInt(match[2], 10) - 1));
  return { month: MONTHS_ES[monthIdx], day: match[3] };
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return time;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const groups = useGroups();
  const events = useEvents();
  const joinGroup = useJoinGroup();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const close = () => setMenuOpen(false);
  const goCreateGroup = () => { close(); router.push('/groups/new'); };
  const openJoin = () => { close(); setJoinOpen(true); setJoinError(null); };
  const closeJoin = () => { setJoinOpen(false); setJoinError(null); };
  const goRoulette = () => { close(); router.push('/planazo/ruleta'); };
  const goCreateEvent = () => {
    close();
    if (groups.data && groups.data.length > 0) {
      router.push({ pathname: '/events/new', params: { groupId: groups.data[0].id } });
    } else {
      router.push('/groups/new');
    }
  };
  const submitInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) { setJoinError('Ingresa el código de invitación.'); return; }
    setJoinError(null);
    try {
      const joined = await joinGroup.mutateAsync(code);
      setInviteCode('');
      closeJoin();
      router.push({ pathname: '/groups/[id]', params: { id: joined.group_id } });
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : SLANG.errorGeneric);
    }
  };

  const fullName = user?.name ?? user?.email ?? 'causa';
  const firstName = fullName.split(' ')[0].split('@')[0];
  const avatarLetter = firstName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greet}>Hola, {firstName}</Text>
            <Text style={styles.greetSub}>¿Qué plan tenemos hoy?</Text>
          </View>
          <Pressable hitSlop={8} style={styles.bellBtn}>
            <Bell size={22} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        </View>

        <Pressable
          onPress={goRoulette}
          style={({ pressed }) => [styles.heroCard, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <View style={styles.heroBg} />
          <View style={styles.heroBgAlt} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Sparkles size={14} color={colors.onAccent} strokeWidth={2.6} />
              <Text style={styles.heroBadgeText}>Planazo</Text>
            </View>
            <Text style={styles.heroTitle}>Tira la ruleta y arma tu plan</Text>
            <Text style={styles.heroSub}>Categoría + presupuesto. Cero indecisión.</Text>
            <View style={styles.heroCta}>
              <Compass size={18} color={colors.primary} strokeWidth={2.6} />
              <Text style={styles.heroCtaText}>Empieza ya</Text>
            </View>
          </View>
        </Pressable>

        <SectionHeader title="Mis Grupos" actionLabel="Ver todos" onAction={() => { /* TODO: pantalla de todos los grupos */ }} />
        {groups.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
        ) : groups.data && groups.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {groups.data.map((g) => <GroupCard key={g.id} group={g} />)}
          </View>
        ) : (
          <EmptyState
            icon={<Users size={32} color={colors.primary} strokeWidth={2.2} />}
            title={SLANG.emptyGroups}
            body="Crea uno o únete con código de invitación"
          />
        )}

        <SectionHeader title="Próximos Planes" />
        {events.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
        ) : events.data && events.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {events.data.map((e) => <EventCard key={e.id} event={e} />)}
          </View>
        ) : (
          <EmptyState
            icon={<Calendar size={32} color={colors.primary} strokeWidth={2.2} />}
            title={SLANG.emptyEvents}
            body="Tira la ruleta o arma uno directo"
          />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        onPress={() => setMenuOpen(true)}
      >
        <Plus color={colors.onPrimary} size={22} strokeWidth={2.8} />
        <Text style={styles.fabText}>Arma el plan</Text>
      </Pressable>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={[styles.menu, { paddingBottom: insets.bottom + spacing.xxl }]} onPress={() => undefined}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>¿Qué armamos?</Text>
            <PrimaryButton label="Tira la ruleta" onPress={goRoulette} icon={<Sparkles size={18} color={colors.onPrimary} strokeWidth={2.6} />} />
            <PrimaryButton variant="accent" label="Crear evento directo" onPress={goCreateEvent} icon={<Calendar size={18} color={colors.onAccent} strokeWidth={2.6} />} />
            <PrimaryButton variant="ghost" label="Crear grupo" onPress={goCreateGroup} />
            <PrimaryButton variant="ghost" label="Unirme con código" onPress={openJoin} />
            <Pressable onPress={close} style={styles.menuCancel}>
              <Text style={styles.menuCancelText}>{SLANG.ctaSoftCancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={joinOpen} animationType="fade" onRequestClose={closeJoin}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={closeJoin}>
          <Pressable style={[styles.menu, { paddingBottom: insets.bottom + spacing.xxl }]} onPress={() => undefined}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>Unirme a un grupo</Text>
            <Input
              label="Código de invitación"
              value={inviteCode}
              onChangeText={(value) => { setInviteCode(value.toUpperCase()); if (joinError) setJoinError(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
              placeholder="EJ. A1B2C3D4"
              error={joinError}
            />
            <PrimaryButton label="Unirme" onPress={submitInviteCode} loading={joinGroup.isPending} />
            <Pressable onPress={closeJoin} style={styles.menuCancel}>
              <Text style={styles.menuCancelText}>{SLANG.ctaSoftCancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.section}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.groupRow}>
        <View style={styles.groupIcon}>
          <Users size={22} color={colors.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.cardTitle}>{group.name}</Text>
          <Text style={styles.cardMeta}>{group.members_count} {group.members_count === 1 ? 'miembro' : 'miembros'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EventCard({ event }: { event: EventListItem }) {
  const pill = parseDatePill(event.date);
  const time = formatTime(event.time);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.eventRow}>
        <View style={styles.datePill}>
          <Text style={styles.dateMonth}>{pill?.month ?? '—'}</Text>
          <Text style={styles.dateDay}>{pill?.day ?? '--'}</Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{event.name}</Text>
          {event.location ? (
            <View style={styles.eventMetaRow}>
              <MapPin size={13} color={colors.textSecondary} strokeWidth={2.2} />
              <Text style={styles.cardMeta} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
          {time ? (
            <View style={styles.eventMetaRow}>
              <Clock size={13} color={colors.textSecondary} strokeWidth={2.2} />
              <Text style={styles.cardMeta}>{time}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.eventRight}>
          <StatusBadge status={event.status} />
          <Text style={styles.eventAmount}>S/ {event.amount_per_person}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.bodyBold, color: colors.onPrimary, fontSize: 18 },
  headerText: { flex: 1 },
  greet: { ...typography.h2, color: colors.textPrimary },
  greetSub: { ...typography.caption, color: colors.primaryDark, marginTop: 2 },
  bellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.lg,
    minHeight: 180,
    ...shadows.floating,
    marginBottom: spacing.lg,
  },
  heroBg: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: colors.secondary, top: -80, right: -60, opacity: 0.55 },
  heroBgAlt: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.accent, bottom: -60, left: -40, opacity: 0.55 },
  heroContent: { gap: spacing.sm, zIndex: 1 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  heroBadgeText: { ...typography.captionBold, color: colors.onAccent, letterSpacing: 0.5 },
  heroTitle: { ...typography.h1, color: colors.surface, marginTop: 4 },
  heroSub: { ...typography.body, color: 'rgba(255,255,255,0.9)' },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.full, marginTop: spacing.sm },
  heroCtaText: { ...typography.bodyBold, color: colors.primary },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  section: { ...typography.h2, color: colors.primaryDark },
  sectionAction: { ...typography.bodyMedium, color: colors.primary },

  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardTitle: { ...typography.bodyBold, color: colors.textPrimary },
  cardMeta: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },

  groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupIcon: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  datePill: {
    width: 54, paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  dateMonth: { ...typography.captionBold, color: colors.primaryDark, letterSpacing: 0.8 },
  dateDay: { ...typography.h1, color: colors.primaryDark, lineHeight: 30, fontSize: 24 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventRight: { alignItems: 'flex-end', gap: 6 },
  eventAmount: { ...typography.bodyBold, color: colors.textPrimary },

  fab: {
    position: 'absolute', bottom: spacing.xl, alignSelf: 'center',
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 14,
    borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    ...shadows.floating,
  },
  fabText: { color: colors.onPrimary, ...typography.button },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  menu: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  menuHandle: { width: 44, height: 5, borderRadius: radius.full, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm },
  menuTitle: { ...typography.h2, color: colors.textPrimary },
  menuCancel: { padding: spacing.md, alignItems: 'center' },
  menuCancelText: { ...typography.bodyMedium, color: colors.textSecondary },
});
