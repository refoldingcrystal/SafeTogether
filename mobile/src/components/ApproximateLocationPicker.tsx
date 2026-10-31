import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '@/components/ui';
import type { ApproximateLocation } from '@/shared/models';
import { colors, radius } from '@/theme';

export function ApproximateLocationPicker({
  value,
  onChange,
  optional = false,
}: {
  value: ApproximateLocation | null;
  onChange: (value: ApproximateLocation | null) => void;
  optional?: boolean;
}) {
  const [manualEntry, setManualEntry] = useState(false);
  useEffect(() => {
    if (!value || value.latitude != null) setManualEntry(false);
    else setManualEntry(true);
  }, [value]);

  async function useCurrentLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access or enter a nearby area manually.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      onChange({ label: `Approx. ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, latitude, longitude, precision: 'neighborhood' });
      setManualEntry(false);
    } catch {
      Alert.alert('Could not get location', 'Try again or enter a nearby area manually.');
    }
  }

  function setManualLabel(label: string) {
    onChange(label.trim() ? { label, precision: 'neighborhood' } : null);
  }

  const manualValue = value?.latitude == null ? value?.label ?? '' : '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>LOCATION{optional ? ' (OPTIONAL)' : ''}</Text>
      <View style={styles.actions}>
        <Button label="Use current location" icon="locate" color={colors.blue} outline onPress={() => { void useCurrentLocation(); }} />
        <Button label="Enter manually" icon="create-outline" color={colors.textMuted} outline onPress={() => setManualEntry(true)} />
      </View>
      {(manualEntry || (value !== null && value.latitude == null)) && (
        <TextInput
          value={manualValue}
          onChangeText={setManualLabel}
          placeholder="Neighbourhood or nearby landmark"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          accessibilityLabel="Approximate location"
        />
      )}
      {value && value.latitude != null && <Text style={styles.value}>Shown near {value.label}</Text>}
      <Text style={styles.hint}>Only an approximate area is shared.</Text>
      {optional && value && (
        <Pressable onPress={() => { onChange(null); setManualEntry(false); }} accessibilityRole="button">
          <Text style={styles.clear}>Don’t share a location</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  label: { color: colors.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  actions: { gap: 7 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  value: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: 11 },
  clear: { color: colors.red, fontSize: 12, fontWeight: '700' },
});
