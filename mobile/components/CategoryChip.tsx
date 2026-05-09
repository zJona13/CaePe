import { StyleSheet, Text, View } from 'react-native';
import { Beer, Drumstick, Mountain, Music, Palette, Trophy } from 'lucide-react-native';
import { categoryColors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';

const CATEGORY_LABELS: Record<string, string> = {
  comida: 'Comida',
  deporte: 'Deporte',
  fiesta: 'Fiesta',
  cultura: 'Cultura',
  aire_libre: 'Aire libre',
  otros: 'Otros',
};

const ICONS = {
  comida: Drumstick,
  deporte: Trophy,
  fiesta: Music,
  cultura: Palette,
  aire_libre: Mountain,
  otros: Beer,
} as const;

type Props = { category: string; size?: 'sm' | 'md'; soft?: boolean };

export function CategoryChip({ category, size = 'sm', soft = false }: Props) {
  const c = categoryColors[category] ?? categoryColors.otros;
  const Icon = (ICONS as Record<string, typeof Drumstick>)[category] ?? Beer;
  const bg = soft ? c.soft : c.bg;
  const fg = soft ? c.bg : c.fg;
  const iconSize = size === 'md' ? 14 : 12;
  return (
    <View style={[styles.chip, { backgroundColor: bg }, size === 'md' && styles.md]}>
      <Icon size={iconSize} color={fg} strokeWidth={2.5} />
      <Text style={[styles.text, { color: fg }, size === 'md' && styles.textMd]}>
        {CATEGORY_LABELS[category] ?? category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, alignSelf: 'flex-start' },
  md: { paddingHorizontal: spacing.md, paddingVertical: 7 },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  textMd: { fontSize: 13 },
});
