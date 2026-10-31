import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mock from '@/data/mock.json';
import { categoryIcons, incidentColors } from '@/icons';
import type { Incident } from '@/shared/models';
import type { Route } from '@/state/app';
import { colors } from '@/theme';

export type TacticalMapProps = {
  shelling: boolean;
  sos: boolean;
  route: Route;
  showBasement: boolean;
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Native placeholder until the team picks a React Native OpenStreetMap renderer; web uses TacticalMap.web.tsx. */
export function TacticalMap({ shelling, sos, incidents, selectedId, onSelect }: TacticalMapProps) {
  const toPercent = (lat: number, lng: number) => ({
    left: `${50 + (lng - mock.me.longitude) * 1500}%`,
    top: `${50 - (lat - mock.me.latitude) * 2500}%`,
  });

  return (
    <View style={styles.map}>
      <View style={styles.river} />
      <View style={styles.roadHorizontal} />
      <View style={styles.roadVertical} />
      {shelling && <View style={[styles.shelling, toPercent(mock.shelling.epicenter.latitude, mock.shelling.epicenter.longitude) as object]} />}
      {incidents.map((incident) => {
        const { latitude, longitude } = incident.approximateLocation;
        if (latitude == null || longitude == null) return null;
        const color = incidentColors[incident.category] ?? colors.blue;
        return (
          <Pressable
            key={incident.id}
            onPress={() => onSelect(incident.id)}
            accessibilityRole="button"
            style={[styles.marker, toPercent(latitude, longitude) as object, { backgroundColor: color }, incident.id === selectedId && styles.markerSelected]}
          >
            <Ionicons name={categoryIcons[incident.category] ?? 'alert'} size={16} color="#fff" />
          </Pressable>
        );
      })}
      <View style={[styles.me, toPercent(mock.me.latitude, mock.me.longitude) as object, { backgroundColor: sos ? colors.red : colors.blue }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFill, backgroundColor: '#EEF1F4' },
  river: { position: 'absolute', right: '12%', top: -20, bottom: -20, width: 46, backgroundColor: '#D6E6EE', transform: [{ rotate: '14deg' }] },
  roadHorizontal: { position: 'absolute', left: 0, right: 0, top: '45%', height: 8, backgroundColor: '#fff' },
  roadVertical: { position: 'absolute', top: 0, bottom: 0, left: '45%', width: 8, backgroundColor: '#fff' },
  shelling: { position: 'absolute', width: 180, height: 180, marginLeft: -90, marginTop: -90, borderRadius: 90, backgroundColor: 'rgba(217,45,32,0.22)', borderWidth: 2, borderColor: colors.red, borderStyle: 'dashed' },
  marker: { position: 'absolute', width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  markerSelected: { transform: [{ scale: 1.2 }] },
  me: { position: 'absolute', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: 11, borderWidth: 4, borderColor: '#fff' },
});
