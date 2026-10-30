import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { checklistItems, guides } from '@/data/guides';
import { colors, shared } from '@/theme';

export default function GuidesScreen() {
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const items = useMemo(() => guides.filter((guide) => `${guide.title} ${guide.summary}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const toggle = (item: string) => setChecked((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]);

  return <Screen>
    <Text style={shared.eyebrow}>SAFETY INFORMATION</Text><Text style={shared.title}>Information & Guides</Text><Text style={shared.subtitle}>General guidance for before, during, and after an emergency. Official local instructions take priority.</Text>
    <TextInput value={query} onChangeText={setQuery} style={shared.input} placeholder="Search guides and topics" placeholderTextColor={colors.muted} accessibilityLabel="Search safety guides" />
    <View style={shared.card}><Text style={shared.cardTitle}>Featured: Emergency preparedness</Text><Text style={shared.body}>Keep essential supplies and a family communication plan ready.</Text><Pressable onPress={() => router.push('/guide/preparedness')} style={shared.secondaryButton}><Text style={shared.secondaryButtonText}>Read preparedness guide</Text></Pressable></View>
    <Text style={shared.cardTitle}>Safety guides</Text>
    {items.map((guide) => <Pressable key={guide.id} onPress={() => router.push(`/guide/${guide.id}`)} style={shared.card}><Text style={styles.guideTitle}>{guide.icon}  {guide.title}</Text><Text style={shared.muted}>{guide.summary}</Text></Pressable>)}
    {!items.length && <View style={shared.card}><Text style={shared.cardTitle}>No guides found</Text><Text style={shared.muted}>Try another search term.</Text></View>}
    <View style={shared.card}><Text style={shared.cardTitle}>Preparedness checklist</Text><Text style={shared.muted}>Progress is saved only while this demonstration screen remains open.</Text>{checklistItems.map((item) => <Pressable key={item} onPress={() => toggle(item)} style={styles.checkline} accessibilityRole="checkbox" accessibilityState={{ checked: checked.includes(item) }}><View style={[styles.checkbox, checked.includes(item) && styles.checked]}><Text style={styles.checkmark}>{checked.includes(item) ? '✓' : ''}</Text></View><Text style={shared.body}>{item}</Text></Pressable>)}</View>
    <Text style={shared.notice}>Emergency contacts vary by country and region. Consult your local official emergency services for the correct number.</Text>
  </Screen>;
}

const styles = StyleSheet.create({ guideTitle: { color: colors.navy, fontSize: 16, fontWeight: '800' }, checkline: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }, checkbox: { height: 21, width: 21, borderRadius: 5, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.green, borderColor: colors.green }, checkmark: { color: colors.surface, fontWeight: '900' } });
