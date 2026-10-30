import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { demonstrationNotice } from '@/shared/demo';
import { colors, shared } from '@/theme';

const markers = [
  { id: 'fire', label: 'Fire report', detail: 'Unverified community report', color: colors.red, left: '43%', top: '33%' },
  { id: 'flood', label: 'Flooding', detail: 'Verified community report', color: '#C18425', left: '68%', top: '59%' },
  { id: 'road', label: 'Road blockage', detail: 'Awaiting review', color: colors.blue, left: '24%', top: '65%' },
];

export default function MapScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const active = markers.find((marker) => marker.id === selected);

  return <Screen>
    <Text style={shared.eyebrow}>COMMUNITY RESPONSE</Text>
    <Text style={shared.title}>Your area, at a glance</Text>
    <Text style={shared.subtitle}>Demonstration information only. This map is not connected to live incidents or your location.</Text>

    <View style={styles.map} accessibilityLabel="Demonstration community map">
      <Text style={[styles.mapLabel, { left: 22, top: 34 }]}>North Park</Text>
      <Text style={[styles.mapLabel, { right: 24, top: 76 }]}>Central district</Text>
      <Text style={[styles.mapLabel, { left: 150, bottom: 35 }]}>Riverside</Text>
      {markers.map((marker) => <Pressable key={marker.id} onPress={() => setSelected(marker.id)} accessibilityRole="button" accessibilityLabel={`${marker.label}, demonstration`} style={[styles.marker, { backgroundColor: marker.color, left: marker.left as never, top: marker.top as never }]}><Text style={styles.markerText}>!</Text></Pressable>)}
      <View style={styles.mapPill}><Text style={styles.mapPillText}>DEMONSTRATION MAP · NOT LIVE</Text></View>
    </View>

    {active && <View style={shared.card}><Text style={shared.cardTitle}>{active.label}</Text><Text style={shared.muted}>{active.detail} · approximate demo location</Text><Pressable onPress={() => router.push('/guide/flood')} style={shared.secondaryButton}><Text style={shared.secondaryButtonText}>Open related safety guide</Text></Pressable></View>}

    <View style={shared.card}><Text style={shared.cardTitle}>Official notice</Text><Text style={styles.noticeTag}>DEMONSTRATION · OFFICIAL NOTICE</Text><Text style={shared.body}>{demonstrationNotice.title}</Text><Text style={shared.muted}>{demonstrationNotice.publishedAt} · example notice</Text></View>
    <View style={styles.actionRow}><Pressable onPress={() => router.push('/report')} style={[shared.primaryButton, shared.urgentButton, styles.actionButton]}><Text style={shared.primaryButtonText}>Report an emergency</Text></Pressable><Pressable onPress={() => router.push('/offer')} style={[shared.secondaryButton, styles.actionButton]}><Text style={shared.secondaryButtonText}>Offer help</Text></Pressable></View>
    <Text style={shared.notice}>In immediate danger? Contact your local emergency number. SafeTogether does not contact emergency services.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  map: { height: 330, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E6EEF0', borderWidth: 1, borderColor: colors.border },
  mapLabel: { position: 'absolute', color: colors.muted, fontSize: 12, fontWeight: '700' },
  marker: { position: 'absolute', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
  markerText: { color: colors.surface, fontSize: 19, fontWeight: '900' },
  mapPill: { position: 'absolute', left: 12, bottom: 12, backgroundColor: colors.surface, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
  mapPillText: { color: colors.muted, fontSize: 10, letterSpacing: .6, fontWeight: '800' },
  noticeTag: { color: colors.blue, fontSize: 10, letterSpacing: .5, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10 }, actionButton: { flex: 1 },
});
