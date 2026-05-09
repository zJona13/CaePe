import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus } from 'lucide-react-native';
import { useGroups, useJoinGroup, type Group } from '../../lib/queries/groups';
import { useEvents, type EventListItem } from '../../lib/queries/events';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PrimaryButton } from '../../components/PrimaryButton';

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
  const openJoin = () => {
    close();
    setJoinOpen(true);
    setJoinError(null);
  };
  const closeJoin = () => {
    setJoinOpen(false);
    setJoinError(null);
  };
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
    if (!code) {
      setJoinError('Ingresa el código de invitación.');
      return;
    }

    setJoinError(null);
    try {
      const joined = await joinGroup.mutateAsync(code);
      setInviteCode('');
      closeJoin();
      router.push({ pathname: '/groups/[id]', params: { id: joined.group_id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : SLANG.errorGeneric;
      setJoinError(message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.greet}>{SLANG.helloUser(user?.name ?? user?.email ?? 'causa')}</Text>

        <Text style={styles.section}>{SLANG.sectionGroups}</Text>
        {groups.isLoading ? <ActivityIndicator color={colors.primary} /> :
          groups.data && groups.data.length > 0 ? (
            groups.data.map((g) => <GroupRow key={g.id} group={g} />)
          ) : (
            <Text style={styles.empty}>{SLANG.emptyGroups}</Text>
          )
        }

        <Text style={styles.section}>{SLANG.sectionEvents}</Text>
        {events.isLoading ? <ActivityIndicator color={colors.primary} /> :
          events.data && events.data.length > 0 ? (
            events.data.map((e) => <EventRow key={e.id} event={e} />)
          ) : (
            <Text style={styles.empty}>{SLANG.emptyEvents}</Text>
          )
        }
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setMenuOpen(true)}>
        <Plus color={colors.surface} size={24} />
        <Text style={styles.fabText}>{SLANG.ctaCreatePlan}</Text>
      </Pressable>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <View style={styles.menu}>
            <PrimaryButton label="Crear grupo" onPress={goCreateGroup} />
            <PrimaryButton variant="secondary" label="Unirme con código" onPress={openJoin} />
            <PrimaryButton variant="secondary" label={SLANG.ctaSpinRoulette} onPress={goRoulette} />
            <PrimaryButton variant="ghost" label="Crear evento directo" onPress={goCreateEvent} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSoftCancel} onPress={close} />
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={joinOpen} animationType="fade" onRequestClose={closeJoin}>
        <Pressable style={styles.overlay} onPress={closeJoin}>
          <Pressable style={styles.joinCard} onPress={() => undefined}>
            <Text style={styles.joinTitle}>Unirme a un grupo</Text>
            <Text style={styles.inputLabel}>Código de invitación</Text>
            <TextInput
              value={inviteCode}
              onChangeText={(value) => {
                setInviteCode(value.toUpperCase());
                if (joinError) setJoinError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
              placeholder="EJ. A1B2C3D4"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            {joinError && <Text style={styles.err}>{joinError}</Text>}
            <PrimaryButton label="Unirme" onPress={submitInviteCode} loading={joinGroup.isPending} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSoftCancel} onPress={closeJoin} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function GroupRow({ group }: { group: Group }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}>
      <Text style={styles.rowTitle}>{group.name}</Text>
      <Text style={styles.rowMeta}>código: {group.invite_code}</Text>
    </Pressable>
  );
}

function EventRow({ event }: { event: EventListItem }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}>
      <View style={styles.eventHead}>
        <Calendar size={16} color={colors.secondary} />
        <Text style={styles.rowTitle}>{event.name}</Text>
      </View>
      <Text style={styles.rowMeta}>{event.date ?? 'sin fecha'} — S/ {event.amount_per_person} c/u — {event.status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  greet: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  row: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.xl,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  fabText: { color: colors.surface, ...typography.button },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', padding: spacing.lg },
  menu: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md, marginBottom: spacing.xl },
  joinCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md, marginBottom: spacing.xl },
  joinTitle: { ...typography.h2, color: colors.textPrimary },
  inputLabel: { ...typography.caption, color: colors.textSecondary },
  input: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  err: { color: colors.error, ...typography.caption },
});
