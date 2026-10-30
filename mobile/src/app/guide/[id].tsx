import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { guides } from '@/data/guides';
import { colors, shared } from '@/theme';

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = guides.find((item) => item.id === id);
  if (!guide) return <Screen><Text style={shared.title}>Guide not found</Text><Pressable style={shared.primaryButton} onPress={() => router.back()}><Text style={shared.primaryButtonText}>Back to guides</Text></Pressable></Screen>;
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← All guides</Text></Pressable>
    <Text style={shared.eyebrow}>INFORMATION & GUIDES</Text><Text style={shared.title}>{guide.icon} {guide.title}</Text>
    <View style={shared.card}><Text style={shared.cardTitle}>When this is relevant</Text><Text style={shared.body}>{guide.when}</Text></View>
    <View style={shared.card}><Text style={shared.cardTitle}>What to do</Text>{guide.steps.map((step, index) => <View key={step} style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><Text style={[shared.body, styles.stepText]}>{step}</Text></View>)}</View>
    <View style={[shared.card, styles.warning]}><Text style={styles.warningTitle}>Important</Text><Text style={shared.body}>{guide.warning}</Text></View>
    <Text style={shared.notice}>This guide gives general information. Follow official local instructions and seek professional help when needed.</Text>
  </Screen>;
}

const styles = StyleSheet.create({ back: { color: colors.blue, fontWeight: '800', fontSize: 14 }, step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { color: colors.blue, fontWeight: '800' }, stepText: { flex: 1 }, warning: { backgroundColor: colors.paleAmber, borderColor: '#F0E2BD' }, warningTitle: { color: colors.amber, fontWeight: '800', fontSize: 16 } });
