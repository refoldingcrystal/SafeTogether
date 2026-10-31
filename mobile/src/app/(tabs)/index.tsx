import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { TacticalMap } from '@/components/TacticalMap';
import { Button, Card, NeedHelpButton, Pill, StatusBadge } from '@/components/ui';
import mock from '@/data/mock.json';
import { categoryIcons, incidentColors, incidentGuide } from '@/icons';
import { demonstrationIncidents } from '@/shared/demo';
import { useApp } from '@/state/app';
import { colors, radius, shadow } from '@/theme';

type HelpKind = 'Emergency' | 'Report an event' | 'Request resources';
type LocationState = 'idle' | 'locating' | 'ready' | 'unavailable';

const helpKinds: { title: HelpKind; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Emergency', detail: 'I need urgent help now', icon: 'medkit-outline' },
  { title: 'Report an event', detail: 'I saw something that needs attention', icon: 'alert-circle-outline' },
  { title: 'Request resources', detail: 'I need supplies, transport, or shelter', icon: 'cube-outline' },
];

export default function MapScreen() {
  const app = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [helpKind, setHelpKind] = useState<HelpKind | null>(null);
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState('');
  const [locationState, setLocationState] = useState<LocationState>('idle');

  async function openHelpMenu() {
    setHelpMenuOpen(true);
    setLocationState('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationState('unavailable');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(`Approx. ${current.coords.latitude.toFixed(2)}, ${current.coords.longitude.toFixed(2)}`);
      setLocationState('ready');
    } catch {
      setLocationState('unavailable');
    }
  }

  function submitHelpRequest() {
    if (!helpKind) return;
    setHelpMenuOpen(false);
    app.setSos(true);
  }

  return (
    <View style={styles.root}>
      <TacticalMap
        shelling={app.shelling}
        sos={app.sos}
        route={app.route}
        showBasement={app.p2pReceived}
        incidents={demonstrationIncidents}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <View style={styles.top} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>SafeTogether</Text>
            <Text style={styles.appSub}>Conflict zone · Warsaw</Text>
          </View>
          {app.offline ? (
            <Pill icon="bluetooth" label="Mesh" color={colors.mesh} bg={colors.meshSoft} />
          ) : (
            <Pill icon="globe-outline" label="Online" color={colors.green} bg={colors.greenSoft} />
          )}
        </View>

        {app.sos ? (
          <Pill icon="heart" label="Help request active · demonstration only" color={colors.blue} bg={colors.blueSoft} />
        ) : (
          <Pill icon="lock-closed" label="Location private · visible only to your family (3)" color={colors.blue} bg={colors.blueSoft} />
        )}

        {app.shelling && (
          <Animated.View entering={FadeInUp} style={styles.alert}>
            <Ionicons name="warning" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>ALERT: SHELLING IN YOUR AREA</Text>
              <Text style={styles.alertText}>Take shelter inside a building now. Avoid the red zone.</Text>
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        {!app.sos && (
          <View style={styles.sosRow} pointerEvents="box-none">
            <NeedHelpButton onPress={openHelpMenu} />
          </View>
        )}
        <BottomCard selectedId={selectedId} onClose={() => setSelectedId(null)} helpKind={helpKind} location={location} details={details} />
      </View>
      {helpMenuOpen && (
        <View style={styles.sheetBackdrop}>
          <Animated.View entering={FadeInUp} style={styles.sheet}>
            <Card>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>What kind of help do you need?</Text>
                  <Text style={styles.muted}>Choose one option, then add details if it is safe to do so.</Text>
                </View>
                <Pressable onPress={() => setHelpMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Close help menu">
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>
              {helpKinds.map((option) => (
                <Pressable key={option.title} onPress={() => setHelpKind(option.title)} accessibilityRole="radio" accessibilityState={{ selected: helpKind === option.title }} style={[styles.helpOption, helpKind === option.title && styles.helpOptionSelected]}>
                  <Ionicons name={option.icon} size={21} color={helpKind === option.title ? colors.blue : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDetail}>{option.detail}</Text>
                  </View>
                  {helpKind === option.title && <Ionicons name="checkmark-circle" size={20} color={colors.blue} />}
                </Pressable>
              ))}
              <Text style={styles.kicker}>YOUR APPROXIMATE LOCATION</Text>
              <TextInput value={location} onChangeText={setLocation} placeholder={locationState === 'locating' ? 'Finding your location…' : 'Neighbourhood or nearby landmark'} placeholderTextColor={colors.textDim} style={styles.input} editable={locationState !== 'locating'} accessibilityLabel="Approximate location" />
              <Text style={styles.locationNote}>{locationState === 'ready' ? 'Location added automatically and rounded for privacy. You can edit it.' : 'Location is optional. You can add a nearby landmark instead.'}</Text>
              <Text style={styles.kicker}>ADDITIONAL DETAILS (OPTIONAL)</Text>
              <TextInput value={details} onChangeText={setDetails} placeholder="What happened or what do you need?" placeholderTextColor={colors.textDim} style={[styles.input, styles.detailsInput]} multiline maxLength={400} textAlignVertical="top" accessibilityLabel="Additional details" />
              <Text style={styles.disclaimer}>This demonstration does not contact emergency services or send your request to other people.</Text>
              <Button icon="send" label="Continue with help request" disabled={!helpKind} onPress={submitHelpRequest} />
            </Card>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function BottomCard({ selectedId, onClose, helpKind, location, details }: { selectedId: string | null; onClose: () => void; helpKind: HelpKind | null; location: string; details: string }) {
  const app = useApp();
  const incident = demonstrationIncidents.find((i) => i.id === selectedId);

  if (app.route === 'basement') {
    return (
      <Animated.View entering={FadeInDown} key="route">
        <Card>
          <Text style={[styles.kicker, { color: colors.green }]}>ROUTE ACTIVE · AVOIDS SHELLING ZONE</Text>
          <Text style={styles.title}>Safe basement – {mock.basement.street}</Text>
          <View style={styles.row}>
            <Info icon="walk" text={`${mock.basement.distance} · 7 min`} />
            <Info icon="person" text={mock.basement.author} />
            <Info icon="bluetooth" text="offline" />
          </View>
          <Button label="End route" color={colors.textMuted} outline onPress={() => app.setRoute(null)} />
        </Card>
      </Animated.View>
    );
  }

  if (app.sos) {
    return (
      <Animated.View entering={FadeInDown} key="need-help">
        <Card style={{ borderWidth: 2, borderColor: colors.red }}>
          <View style={styles.row}>
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>HELP</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{helpKind ?? 'Help'} request active</Text>
              <Text style={styles.muted}>{location ? `${location} · ` : ''}This is a demonstration and has not contacted responders or other people.</Text>
              {!!details.trim() && <Text style={styles.muted}>Details: {details.trim()}</Text>}
            </View>
          </View>
          <Button icon="shield-checkmark" label="I am safe" color={colors.green} onPress={() => app.setSos(false)} />
        </Card>
      </Animated.View>
    );
  }

  if (incident) {
    const color = incidentColors[incident.category] ?? colors.blue;
    const guide = incidentGuide[incident.category];
    return (
      <Animated.View entering={FadeInDown} key={incident.id}>
        <Card>
          <View style={styles.row}>
            <View style={[styles.incidentIcon, { backgroundColor: color }]}>
              <Ionicons name={categoryIcons[incident.category] ?? 'alert'} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color }]}>COMMUNITY REPORT · {incident.id}</Text>
              <Text style={styles.title}>{incident.category}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </Pressable>
          </View>
          <Text style={styles.body}>{incident.description}</Text>
          <View style={styles.row}>
            <StatusBadge status={incident.verificationStatus} />
            <Info icon="location" text={`approx. ${incident.approximateLocation.label}`} />
            <Info icon="time" text={incident.submittedAt} />
          </View>
          {guide && <Button icon="book" label="Open safety guide" color={colors.blue} outline onPress={() => router.push(`/guide/${guide}`)} />}
        </Card>
      </Animated.View>
    );
  }

  const e = mock.evacuation;
  return (
    <Animated.View entering={FadeInDown} key="evac">
      <Card>
        <Text style={[styles.kicker, { color: colors.green }]}>NEAREST SAFE POINT</Text>
        <Text style={styles.title}>{e.name}</Text>
        <View style={styles.row}>
          <Info icon="navigate" text="5.0 km" />
          <Info icon="walk" text="approx. 65 min" />
          <Info icon="people" text={e.capacity} />
        </View>
        <View style={styles.divider} />
        <Text style={styles.kicker}>YOUR FAMILY</Text>
        <View style={styles.row}>
          {mock.family.map((f) => (
            <View key={f.id} style={styles.person}>
              <View style={[styles.avatar, { backgroundColor: f.color }]}>
                <Text style={styles.avatarText}>{f.initials}</Text>
              </View>
              <View>
                <Text style={styles.personName}>{f.name}</Text>
                <Text style={styles.personStatus}>{f.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </Animated.View>
  );
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 10,
    ...shadow,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 17, fontWeight: '900', color: colors.text },
  appSub: { fontSize: 12, color: colors.textMuted },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.red,
    borderRadius: radius.md,
    padding: 12,
    ...shadow,
  },
  alertTitle: { color: '#fff', fontWeight: '900', fontSize: 13 },
  alertText: { color: '#fff', fontSize: 12, marginTop: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12 },
  sosRow: { alignItems: 'flex-end', marginBottom: 4 },
  sheetBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', backgroundColor: '#10182888', padding: 12 },
  sheet: { maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  helpOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  helpOptionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  optionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  optionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  detailsInput: { minHeight: 92 },
  locationNote: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  disclaimer: { color: colors.orange, backgroundColor: colors.orangeSoft, borderRadius: radius.md, padding: 10, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textDim },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border },
  person: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  personName: { fontSize: 13, fontWeight: '700', color: colors.text },
  personStatus: { fontSize: 11, color: colors.green, fontWeight: '600' },
  incidentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sosBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBadgeText: { color: '#fff', fontWeight: '900' },
});
