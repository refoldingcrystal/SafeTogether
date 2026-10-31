import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { guides } from '@/data/guides';
import { guideIcons } from '@/icons';
import { colors, shared } from '@/theme';

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = guides.find((item) => item.id === id);

  if (!guide) {
    return (
      <Screen>
        <Text style={shared.title}>Guide not found</Text>
        <Button label="Back to guides" color={colors.text} onPress={() => router.back()} />
      </Screen>
    );
  }

  const meta = guideIcons[guide.id] ?? { icon: 'book' as const, color: colors.blue };
  return (
    <Screen>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/guides'))} style={styles.back}>
        <Ionicons name="chevron-back" size={18} color={colors.blue} />
        <Text style={styles.backText}>All guides</Text>
      </Pressable>

      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon} size={26} color="#fff" />
        </View>
        <Text style={[shared.title, { flex: 1 }]}>{guide.title}</Text>
      </View>

      <Card>
        <Text style={shared.kicker}>WHEN THIS IS RELEVANT</Text>
        <Text style={shared.body}>{guide.when}</Text>
      </Card>

      <Card>
        <Text style={shared.kicker}>WHAT TO DO</Text>
        {guide.steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: meta.color }]}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={[shared.body, { flex: 1 }]}>{step}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ backgroundColor: colors.orangeSoft }}>
        <View style={styles.warnHead}>
          <Ionicons name="warning" size={18} color={colors.orange} />
          <Text style={[shared.kicker, { color: colors.orange }]}>IMPORTANT</Text>
        </View>
        <Text style={shared.body}>{guide.warning}</Text>
      </Card>

      <Text style={shared.muted}>This guide gives general information. Follow official local instructions and seek professional help when needed.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.blue, fontWeight: '700', fontSize: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
