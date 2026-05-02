import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dice5 } from 'lucide-react-native';
import { PlanCard } from '../../components/PlanCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchRandomPlan, type Plan, type PlanCategory } from '../../lib/queries/plans';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const CATEGORIES: PlanCategory[] = ['comida', 'deporte', 'fiesta', 'cultura', 'aire_libre', 'otros'];

export default function Ruleta() {
  const [selected, setSelected] = useState<PlanCategory | null>(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [people, setPeople] = useState('');
  const [result, setResult] = useState<Plan | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rotate = useRef(new Animated.Value(0)).current;

  const spin = async () => {
    setErr(null); setResult(null); setSpinning(true);
    rotate.setValue(0);
    Animated.timing(rotate, {
      toValue: 3,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    try {
      const plan = await fetchRandomPlan({
        category: selected ?? undefined,
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
      });
      setTimeout(() => { setResult(plan); setSpinning(false); }, 1500);
    } catch (e) {
      setErr((e as Error).message);
      setSpinning(false);
    }
  };

  const useThis = () => {
    if (!result) return;
    router.push({ pathname: '/events/new', params: { planId: result.id, people } });
  };

  const rotateInterpolate = rotate.interpolate({ inputRange: [0, 3], outputRange: ['0deg', '1080deg'] });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}>
        <Text style={styles.title}>Planazo</Text>

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setSelected((s) => (s === c ? null : c))}
              style={[styles.chip, selected === c && styles.chipActive]}>
              <Text style={[styles.chipText, selected === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Rango precio (S/)</Text>
        <View style={styles.priceRow}>
          <TextInput placeholder="min" keyboardType="number-pad" value={priceMin} onChangeText={setPriceMin} style={[styles.input, { flex: 1 }]} placeholderTextColor={colors.textSecondary} />
          <TextInput placeholder="max" keyboardType="number-pad" value={priceMax} onChangeText={setPriceMax} style={[styles.input, { flex: 1 }]} placeholderTextColor={colors.textSecondary} />
        </View>

        <Text style={styles.label}># personas (para calcular monto luego)</Text>
        <TextInput placeholder="ej. 4" keyboardType="number-pad" value={people} onChangeText={setPeople} style={styles.input} placeholderTextColor={colors.textSecondary} />

        <Animated.View style={[styles.dice, { transform: [{ rotate: rotateInterpolate }] }]}>
          <Dice5 size={64} color={colors.primary} />
        </Animated.View>

        <PrimaryButton label={SLANG.ctaSpinRoulette} onPress={spin} loading={spinning} />

        {err && <Text style={styles.err}>{err}</Text>}

        {result && (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.resultTitle}>{SLANG.rouletteResult}</Text>
            <PlanCard plan={result} selected />
            <PrimaryButton variant="secondary" label={SLANG.ctaUseThisPlan} onPress={useThis} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSpinAgain} onPress={spin} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.surface },
  priceRow: { flexDirection: 'row', gap: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  dice: { alignItems: 'center', padding: spacing.lg },
  resultTitle: { ...typography.h2, color: colors.primary },
  err: { color: colors.error, ...typography.caption },
});
