import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { checklistItems, guides } from '@/data/guides';
import { guideIcons } from '@/icons';
import { colors, radius, shared } from '@/theme';

export default function GuidesScreen() {
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const items = useMemo(() => guides.filter((guide) => `${guide.title} ${guide.summary}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const toggle = (item: string) => setChecked((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]));

  return (
    <Screen>
      <View>
        <Text style={shared.title}>Safety guides</Text>
        <Text style={shared.subtitle}>What to do before, during and after an emergency. Works offline.</Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textDim} />
        <TextInput value={query} onChangeText={setQuery} style={styles.searchInput} placeholder="Search guides and topics" placeholderTextColor={colors.textDim} accessibilityLabel="Search safety guides" />
      </View>

      {items.map((guide, i) => {
        const meta = guideIcons[guide.id] ?? { icon: 'book' as const, color: colors.blue };
        return (
          <Animated.View key={guide.id} entering={FadeInDown.delay(i * 60)}>
            <Pressable onPress={() => router.push(`/guide/${guide.id}`)}>
              <Card style={styles.guideRow}>
                <View style={[styles.guideIcon, { backgroundColor: `${meta.color}1A` }]}>
                  <Ionicons name={meta.icon} size={22} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={shared.cardTitle}>{guide.title}</Text>
                  <Text style={shared.muted}>{guide.summary}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
              </Card>
            </Pressable>
          </Animated.View>
        );
      })}
      {!items.length && (
        <Card>
          <Text style={shared.cardTitle}>No guides found</Text>
          <Text style={shared.muted}>Try another search term.</Text>
        </Card>
      )}

      <Card>
        <View style={styles.checkHead}>
          <Text style={shared.kicker}>PREPAREDNESS CHECKLIST</Text>
          <Text style={[shared.kicker, { color: colors.green }]}>
            {checked.length}/{checklistItems.length}
          </Text>
        </View>
        {checklistItems.map((item) => {
          const on = checked.includes(item);
          return (
            <Pressable key={item} onPress={() => toggle(item)} style={styles.checkline} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <View style={[styles.checkbox, on && styles.checked]}>{on && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
              <Text style={[shared.body, on && styles.done]}>{item}</Text>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minHeight: 44, fontSize: 15, color: colors.text },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkHead: { flexDirection: 'row', justifyContent: 'space-between' },
  checkline: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30 },
  checkbox: { height: 22, width: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.green, borderColor: colors.green },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
});
