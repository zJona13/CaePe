import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus } from 'lucide-react-native';
import { useGroups, type Group } from '../../lib/queries/groups';
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
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  const goCreateGroup = () => { close(); router.push('/groups/new'); };
  const goRoulette = () => { close(); router.push('/planazo/ruleta'); };
  const goCreateEvent = () => {
    close();
    if (groups.data && groups.data.length > 0) {
      router.push({ pathname: '/events/new', params: { groupId: groups.data[0].id } });
    } else {
      router.push('/groups/new');
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
            <PrimaryButton label="Crear collera" onPress={goCreateGroup} />
            <PrimaryButton variant="secondary" label={SLANG.ctaSpinRoulette} onPress={goRoulette} />
            <PrimaryButton variant="ghost" label="Crear evento directo" onPress={goCreateEvent} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSoftCancel} onPress={close} />
          </View>
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
});
