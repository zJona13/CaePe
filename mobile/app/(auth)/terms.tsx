import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Qué es CaePe',
    body: 'CaePe es una app social para organizar salidas grupales: elegir un plan, dividir el presupuesto entre los participantes y confirmar los pagos entre amigos.',
  },
  {
    title: '2. CaePe no retiene dinero',
    body: 'Los pagos se realizan directamente entre las personas mediante Yape o Plin, fuera de la aplicación. CaePe nunca recibe, custodia ni transfiere fondos: solo organiza la información del gasto.',
  },
  {
    title: '3. Edad mínima',
    body: 'El servicio está dirigido a personas mayores de 18 años. Al crear una cuenta declaras tener al menos 18 años.',
  },
  {
    title: '4. Tu responsabilidad',
    body: 'Te comprometes a brindar datos veraces (nombre, correo, teléfono y número de Yape/Plin) y a coordinar y completar los pagos directamente con los demás participantes de cada salida.',
  },
  {
    title: '5. Datos personales',
    body: 'Usamos tu correo y teléfono para identificar tu cuenta y para facilitar los pagos por Yape/Plin entre usuarios. No vendemos tus datos a terceros.',
  },
  {
    title: '6. Disputas de pago',
    body: 'CaePe no es parte de las transacciones entre usuarios y no se responsabiliza por desacuerdos, montos no pagados ni reembolsos. Cualquier disputa se resuelve directamente entre los participantes.',
  },
  {
    title: '7. Cambios y contacto',
    body: 'Podemos actualizar estos términos; el uso continuado de la app implica su aceptación. Para consultas, escríbenos desde el perfil de la app.',
  },
];

export default function Terms() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Términos y Condiciones" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>Al crear tu cuenta en CaePe aceptas los siguientes términos:</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        <Text style={styles.disclaimer}>
          Este texto es referencial y no constituye asesoría legal. Será reemplazado por la versión legal definitiva.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton size="lg" label="Entendido" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  intro: { ...typography.body, color: colors.textSecondary },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.bodyBold, color: colors.textPrimary },
  sectionBody: { ...typography.body, color: colors.textSecondary },
  disclaimer: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm },
});
