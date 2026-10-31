import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { TacticalMap } from '@/components/TacticalMap';
import { Button, Card, NeedHelpButton, StatusBadge } from '@/components/ui';
import mock from '@/data/mock.json';
import { categoryIcons, incidentColors, incidentGuide } from '@/icons';
import { demonstrationDangerZones, demonstrationIncidents, emergencySites, type DangerZone, type EmergencySite } from '@/shared/demo';
import { requestSafeRoadRoute, type SafeRoute } from '@/shared/routing';
import { useApp } from '@/state/app';
import { colors, radius, shadow } from '@/theme';

type HelpKind = 'Emergency' | 'Report an event' | 'Request resources';
const helpKinds: Record<HelpKind, string[]> = {
  Emergency: ['Medical emergency', 'Fire', 'Trapped person'],
  'Report an event': ['Flooding', 'Riot or civil unrest', 'Armed conflict or shelling'],
  'Request resources': ['Food or water', 'Shelter', 'Transport'],
};

export default function MapScreen() {
  const app = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDangerId, setSelectedDangerId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [routeFrom, setRouteFrom] = useState('me');
  const [routeTo, setRouteTo] = useState(emergencySites[0].id);
  const [customDestination, setCustomDestination] = useState<RouteOption | null>(null);
  const [safeRoute, setSafeRoute] = useState<SafeRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [helpKind, setHelpKind] = useState<HelpKind | null>(null);
  const [request, setRequest] = useState('');
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState('');
  const [manualLocation, setManualLocation] = useState(false);
  const incidents = useMemo(
    () =>
      demonstrationIncidents.filter((incident) => {
        if (filter === 'verified') return incident.verificationStatus === 'verified';
        if (filter === 'review') return incident.verificationStatus !== 'verified';
        return true;
      }),
    [filter],
  );
  const routeOptions = useMemo(() => [{ id: 'me', title: 'My location', coordinate: mock.me }, ...emergencySites, ...(customDestination ? [customDestination] : [])], [customDestination]);
  const from = routeOptions.find((point) => point.id === routeFrom) ?? routeOptions[0];
  const to = routeOptions.find((point) => point.id === routeTo) ?? emergencySites[0];

  async function calculateRoute(start: RouteOption['coordinate'], destination: RouteOption['coordinate']) {
    if (app.offline) {
      setRouteError('Offline — reconnect to calculate a road route.');
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    try {
      setSafeRoute(await requestSafeRoadRoute(start, destination, demonstrationDangerZones));
    } catch {
      setRouteError('No verified safe road route is available. Choose another destination or try again shortly.');
    } finally {
      setRouteLoading(false);
    }
  }

  async function planRoute() {
    await calculateRoute(from.coordinate, to.coordinate);
  }

  async function openHelpMenu() {
    setHelpMenuOpen(true);
    setManualLocation(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(`Approx. ${current.coords.latitude.toFixed(2)}, ${current.coords.longitude.toFixed(2)}`);
    } catch {
      setManualLocation(true);
    }
  }

  return (
    <View style={styles.root}>
      <TacticalMap
        shelling={app.shelling}
        sos={app.sos}
        route={app.route}
        showBasement={app.p2pReceived}
        offline={app.offline}
        dangerZones={demonstrationDangerZones}
        emergencySites={emergencySites}
        plannedRoute={safeRoute?.coordinates}
        destination={customDestination?.coordinate}
        incidents={incidents}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
        }}
        onSelectDanger={(id) => {
          setSelectedDangerId(id);
          setSelectedId(null);
          setSelectedSiteId(null);
        }}
        onSelectSite={(id) => {
          setSelectedSiteId(id);
          setSelectedId(null);
          setSelectedDangerId(null);
        }}
        onDestinationLongPress={(coordinate) => {
          const destination = { id: 'dropped-pin', title: 'Dropped pin', coordinate };
          setCustomDestination(destination);
          setRouteTo(destination.id);
          setSafeRoute(null);
          setRouteError(null);
          setSelectedId(null);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
          setPlannerOpen(true);
          void calculateRoute(mock.me, coordinate);
        }}
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
        </View>

        <View style={styles.filters} accessibilityRole="radiogroup" accessibilityLabel="Incident filters">
          <FilterChip label="All incidents" active={filter === 'all'} onPress={() => selectFilter('all', setFilter, setSelectedId)} />
          <FilterChip label="Verified" active={filter === 'verified'} onPress={() => selectFilter('verified', setFilter, setSelectedId)} />
          <FilterChip label="Needs review" active={filter === 'review'} onPress={() => selectFilter('review', setFilter, setSelectedId)} />
        </View>

      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        {!app.sos && (
          <View style={styles.sosRow} pointerEvents="box-none">
            <NeedHelpButton onPress={openHelpMenu} />
          </View>
        )}
        <BottomCard
          selectedId={selectedId}
          selectedDanger={demonstrationDangerZones.find((zone) => zone.id === selectedDangerId)}
          selectedSite={emergencySites.find((site) => site.id === selectedSiteId)}
          plannerOpen={plannerOpen}
          setPlannerOpen={setPlannerOpen}
          routeOptions={routeOptions}
          routeFrom={routeFrom}
          routeTo={routeTo}
          setRouteFrom={(id) => {
            setRouteFrom(id);
            setSafeRoute(null);
          }}
          setRouteTo={(id) => {
            setRouteTo(id);
            setSafeRoute(null);
          }}
          safeRoute={safeRoute}
          routeLoading={routeLoading}
          routeError={routeError}
          onPlanRoute={planRoute}
          onClose={() => {
            setSelectedId(null);
            setSelectedDangerId(null);
            setSelectedSiteId(null);
          }}
        />
      </View>
      {helpMenuOpen && (
        <View style={styles.helpPage}>
          <ScrollView contentContainerStyle={styles.helpContent}>
            <View style={styles.helpHeader}>
              <View style={{ flex: 1 }}><Text style={styles.title}>What kind of help do you need?</Text><Text style={styles.muted}>Choose an example or describe another request.</Text></View>
              <Pressable onPress={() => setHelpMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Close help menu"><Ionicons name="close" size={24} color={colors.textMuted} /></Pressable>
            </View>
            {(Object.keys(helpKinds) as HelpKind[]).map((kind) => <Pressable key={kind} onPress={() => { setHelpKind(kind); setRequest(''); }} style={[styles.helpOption, helpKind === kind && styles.helpOptionActive]}><Text style={styles.optionTitle}>{kind}</Text><Text style={styles.optionDetail}>{helpKinds[kind].join(' · ')}</Text></Pressable>)}
            {helpKind && <View style={styles.quickChoices}>{helpKinds[helpKind].map((example) => <Pressable key={example} onPress={() => setRequest(example)} style={[styles.quickChoice, request === example && styles.quickChoiceActive]}><Text style={styles.quickChoiceText}>{example}</Text></Pressable>)}<Pressable onPress={() => setRequest('')} style={styles.quickChoice}><Text style={styles.quickChoiceText}>Other</Text></Pressable></View>}
            {helpKind && <TextInput value={request} onChangeText={setRequest} placeholder="Other request (optional)" placeholderTextColor={colors.textDim} style={styles.input} />}
            <Text style={styles.kicker}>LOCATION</Text>
            <View style={styles.locationChoices}><Button label="Use current location" icon="locate" color={colors.blue} outline onPress={() => { setManualLocation(false); void openHelpMenu(); }} /><Button label="Enter manually" color={colors.textMuted} outline onPress={() => { setManualLocation(true); setLocation(''); }} /></View>
            {manualLocation ? <TextInput value={location} onChangeText={setLocation} placeholder="Neighbourhood or nearby landmark" placeholderTextColor={colors.textDim} style={styles.input} /> : <Text style={styles.muted}>{location || 'Finding your approximate location…'}</Text>}
            <Text style={styles.kicker}>ADDITIONAL DETAILS (OPTIONAL)</Text><TextInput value={details} onChangeText={setDetails} placeholder="What happened or what do you need?" placeholderTextColor={colors.textDim} style={[styles.input, styles.detailsInput]} multiline textAlignVertical="top" />
            <Text style={styles.disclaimer}>This demonstration does not contact emergency services or send your request to other people.</Text><Button label="Continue with help request" icon="send" disabled={!helpKind} onPress={() => { setHelpMenuOpen(false); app.setSos(true); }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

type MapFilter = 'all' | 'verified' | 'review';
type RouteOption = { id: string; title: string; coordinate: { latitude: number; longitude: number }; kind?: EmergencySite['kind'] };

function selectFilter(filter: MapFilter, setFilter: (filter: MapFilter) => void, setSelectedId: (id: string | null) => void) {
  setFilter(filter);
  setSelectedId(null);
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BottomCard({
  selectedId,
  selectedDanger,
  selectedSite,
  plannerOpen,
  setPlannerOpen,
  routeOptions,
  routeFrom,
  routeTo,
  setRouteFrom,
  setRouteTo,
  safeRoute,
  routeLoading,
  routeError,
  onPlanRoute,
  onClose,
}: {
  selectedId: string | null;
  selectedDanger?: DangerZone;
  selectedSite?: EmergencySite;
  plannerOpen: boolean;
  setPlannerOpen: (open: boolean) => void;
  routeOptions: RouteOption[];
  routeFrom: string;
  routeTo: string;
  setRouteFrom: (id: string) => void;
  setRouteTo: (id: string) => void;
  safeRoute: SafeRoute | null;
  routeLoading: boolean;
  routeError: string | null;
  onPlanRoute: () => void;
  onClose: () => void;
}) {
  const app = useApp();
  const incident = demonstrationIncidents.find((i) => i.id === selectedId);

  if (plannerOpen) {
    return (
      <RoutePlanner
        routeOptions={routeOptions}
        routeFrom={routeFrom}
        routeTo={routeTo}
        setRouteFrom={setRouteFrom}
        setRouteTo={setRouteTo}
        safeRoute={safeRoute}
        routeLoading={routeLoading}
        routeError={routeError}
        onPlanRoute={onPlanRoute}
        onClose={() => setPlannerOpen(false)}
      />
    );
  }

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
              <Text style={styles.title}>Help request active</Text>
              <Text style={styles.muted}>This demonstration has not contacted responders or other people.</Text>
            </View>
          </View>
          <Button icon="shield-checkmark" label="I am safe" color={colors.green} onPress={() => app.setSos(false)} />
        </Card>
      </Animated.View>
    );
  }

  if (selectedDanger) {
    const color = dangerColor(selectedDanger);
    return (
      <Animated.View entering={FadeInDown} key={selectedDanger.id}>
        <Card style={{ borderLeftWidth: 5, borderLeftColor: color }}>
          <View style={styles.row}>
            <View style={[styles.incidentIcon, { backgroundColor: color }]}>
              <Ionicons name={selectedDanger.kind === 'fire' ? 'flame' : selectedDanger.kind === 'flooding' ? 'water' : 'warning'} size={21} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color }]}>ACTIVE DANGER · {selectedDanger.severity.toUpperCase()}</Text>
              <Text style={styles.title}>{selectedDanger.title}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
          </View>
          <Text style={styles.body}>{selectedDanger.summary}</Text>
          <Text style={styles.muted}>Danger radius: {Math.round(selectedDanger.radius)} m</Text>
        </Card>
      </Animated.View>
    );
  }

  if (selectedSite) {
    return (
      <Animated.View entering={FadeInDown} key={selectedSite.id}>
        <Card style={{ borderLeftWidth: 5, borderLeftColor: siteColor(selectedSite) }}>
          <View style={styles.row}>
            <View style={[styles.incidentIcon, { backgroundColor: siteColor(selectedSite) }]}>
              <Ionicons name={selectedSite.kind === 'shelter' ? 'bed' : selectedSite.kind === 'aid' ? 'medkit' : 'shield-checkmark'} size={21} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: siteColor(selectedSite) }]}>{selectedSite.kind.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.title}>{selectedSite.title}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
          </View>
          <Text style={styles.body}>{selectedSite.summary}</Text>
          {selectedSite.capacity && <Text style={styles.muted}>{selectedSite.capacity}</Text>}
          <Button icon="navigate" label="Plan safe route here" color={colors.green} onPress={() => { setRouteTo(selectedSite.id); setPlannerOpen(true); }} />
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
        <Text style={styles.routeHint}>Or long-press anywhere on the map to set a custom destination.</Text>
        <Button icon="navigate" label="Plan a safe road route" color={colors.green} onPress={() => setPlannerOpen(true)} />
      </Card>
    </Animated.View>
  );
}

function RoutePlanner({
  routeOptions,
  routeFrom,
  routeTo,
  setRouteFrom,
  setRouteTo,
  safeRoute,
  routeLoading,
  routeError,
  onPlanRoute,
  onClose,
}: {
  routeOptions: RouteOption[];
  routeFrom: string;
  routeTo: string;
  setRouteFrom: (id: string) => void;
  setRouteTo: (id: string) => void;
  safeRoute: SafeRoute | null;
  routeLoading: boolean;
  routeError: string | null;
  onPlanRoute: () => void;
  onClose: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown} key="planner">
      <Card style={{ borderWidth: 2, borderColor: colors.green }}>
        <View style={styles.row}>
          <View style={[styles.incidentIcon, { backgroundColor: colors.green }]}><Ionicons name="navigate" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.green }]}>SAFE ROAD ROUTE</Text>
            <Text style={styles.title}>Find the shortest safe route</Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close route planner" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
        </View>
        <RoutePointPicker label="A · Start" selected={routeFrom} points={routeOptions} onSelect={setRouteFrom} />
        <RoutePointPicker label="B · Destination" selected={routeTo} points={routeOptions.filter((point) => point.id !== 'me')} onSelect={setRouteTo} />
        <Text style={styles.routeHint}>Long-press a map location to use it as a custom destination.</Text>
        {safeRoute && (
          <View style={styles.routeSummary}>
            <Ionicons name="shield-checkmark" size={17} color={colors.green} />
            <Text style={styles.routeSummaryText}>Shortest verified route · {safeRoute.distanceKm.toFixed(1)} km · {safeRoute.durationMinutes} min · avoids {safeRoute.avoidedZoneIds.length} zone{safeRoute.avoidedZoneIds.length === 1 ? '' : 's'}</Text>
          </View>
        )}
        {routeError && <Text style={styles.routeError}>{routeError}</Text>}
        <Text style={styles.routeDisclaimer}>Uses roads from OpenStreetMap. Check official instructions before travelling.</Text>
        <Button icon={routeLoading ? 'hourglass' : 'navigate'} label={routeLoading ? 'Finding shortest safe route…' : 'Find shortest safe route'} color={colors.green} disabled={routeLoading} onPress={onPlanRoute} />
      </Card>
    </Animated.View>
  );
}

function RoutePointPicker({ label, selected, points, onSelect }: { label: string; selected: string; points: RouteOption[]; onSelect: (id: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.kicker}>{label}</Text>
      <View style={styles.routeChoices}>
        {points.map((point) => (
          <Pressable key={point.id} onPress={() => onSelect(point.id)} style={[styles.routeChoice, point.id === selected && styles.routeChoiceActive]}>
            <Text style={[styles.routeChoiceText, point.id === selected && styles.routeChoiceTextActive]}>{point.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function dangerColor(zone: DangerZone) {
  return zone.kind === 'flooding' ? colors.violet : zone.kind === 'fire' ? '#F04438' : colors.red;
}

function siteColor(site: EmergencySite) {
  return site.kind === 'shelter' ? colors.green : site.kind === 'aid' ? colors.orange : colors.blue;
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7, ...shadow },
  filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  routeChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  routeChoice: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 7 },
  routeChoiceActive: { backgroundColor: colors.green, borderColor: colors.green },
  routeChoiceText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  routeChoiceTextActive: { color: '#fff' },
  routeSummary: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.greenSoft, borderRadius: radius.sm, padding: 9 },
  routeSummaryText: { flex: 1, color: colors.green, fontSize: 12, fontWeight: '800' },
  routeError: { color: colors.red, fontSize: 12, fontWeight: '700' },
  routeDisclaimer: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  routeHint: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12 },
  sosRow: { alignItems: 'center', marginBottom: 4 },
  helpPage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bg },
  helpContent: { padding: 20, paddingBottom: 40, gap: 12 },
  helpHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  helpOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  helpOptionActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  optionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  optionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  quickChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChoice: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  quickChoiceActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  quickChoiceText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  locationChoices: { flexDirection: 'row', gap: 8 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  detailsInput: { minHeight: 92 },
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
