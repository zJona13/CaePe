import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Compass, MapPin, Plus, Sparkles, Users, Wallet } from 'lucide-react-native';
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

export default function Home() {
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

  const firstName = (user?.name ?? user?.email ?? 'causa').split(' ')[0].split('@')[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Hola</Text>
            <Text style={styles.greet}>{firstName} 👋</Text>
          </View>
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

        <SectionHeader title={SLANG.sectionGroups} icon={<Users size={18} color={colors.secondary} strokeWidth={2.5} />} />
        {groups.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
        ) : groups.data && groups.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {groups.data.map((g) => <GroupRow key={g.id} group={g} />)}
          </View>
        ) : (
          <EmptyState
            icon={<Users size={32} color={colors.secondary} strokeWidth={2.2} />}
            title={SLANG.emptyGroups}
            body="Crea uno o únete con código de invitación"
            tint="secondary"
          />
        )}

        <SectionHeader title={SLANG.sectionEvents} icon={<Calendar size={18} color={colors.primary} strokeWidth={2.5} />} />
        {events.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
        ) : events.data && events.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {events.data.map((e) => <EventRow key={e.id} event={e} />)}
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
        <Text style={styles.fabText}>{SLANG.ctaCreatePlan}</Text>
      </Pressable>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.menu} onPress={() => undefined}>
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
        <Pressable style={styles.overlay} onPress={closeJoin}>
          <Pressable style={styles.menu} onPress={() => undefined}>
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
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>{icon}</View>
      <Text style={styles.section}>{title}</Text>
    </View>
  );
}

function GroupRow({ group }: { group: Group }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}
      style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondarySoft }]}>
        <Users size={20} color={colors.secondary} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{group.name}</Text>
        <Text style={styles.rowMeta}>código · {group.invite_code}</Text>
      </View>
    </Pressable>
  );
}

function EventRow({ event }: { event: EventListItem }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
        <Calendar size={20} color={colors.primary} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle}>{event.name}</Text>
        <View style={styles.rowMetaRow}>
          <MapPin size={12} color={colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.rowMeta}>{event.date ?? 'sin fecha'}</Text>
          <Wallet size={12} color={colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.rowMeta}>S/ {event.amount_per_person}</Text>
        </View>
      </View>
      <StatusBadge status={event.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  eyebrow: { ...typography.caption, color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  greet: { ...typography.h1, color: colors.textPrimary },

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

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  section: { ...typography.h2, color: colors.textPrimary },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  rowIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rowMeta: { ...typography.caption, color: colors.textSecondary },

  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 14,
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
