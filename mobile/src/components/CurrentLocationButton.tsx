import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { Coordinate } from '@/shared/demo';
import { colors, shadow } from '@/theme';

export function CurrentLocationButton({ onLocation }: { onLocation: (location: Coordinate) => void }) {
  const [locating, setLocating] = useState(false);

  async function centerOnLocation() {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to center the map on your position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert('Could not get location', 'Try again when your device location is available.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <Pressable
      onPress={() => { void centerOnLocation(); }}
      accessibilityRole="button"
      accessibilityLabel="Center map on my location"
      accessibilityState={{ disabled: locating }}
      style={styles.button}
    >
      <Ionicons name={locating ? 'locate-outline' : 'locate'} size={22} color={colors.blue} />
      {locating && <Text style={styles.loading}>Locating…</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', zIndex: 1600, right: 14, bottom: 250, minWidth: 48, height: 48, paddingHorizontal: 12, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, ...shadow },
  loading: { color: colors.text, fontSize: 12, fontWeight: '700' },
});
