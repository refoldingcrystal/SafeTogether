import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { TacticalMap } from '@/components/TacticalMap';
import { ApproximateLocationPicker } from '@/components/ApproximateLocationPicker';
import { Button, Card, NeedHelpButton, StatusBadge } from '@/components/ui';
import mock from '@/data/mock.json';
import { categoryIcons, incidentColors, incidentGuide } from '@/icons';
import { demonstrationDangerZones, demonstrationHelpOffers, demonstrationIncidents, emergencySites, nearbyPeople, type Coordinate, type DangerZone, type EmergencySite, type MapHelpOffer } from '@/shared/demo';
import { api, type MapSnapshot } from '@/services/api';
import type { ApproximateLocation, Incident, PersonalHelpCategory } from '@/shared/models';
import { requestSafeRoadRoute, type SafeRoute } from '@/shared/routing';
import { useApp } from '@/state/app';
import { colors, radius } from '@/theme';

type HelpKind = 'Emergency' | 'Request resources';
const helpKinds: Record<HelpKind, string[]> = {
  Emergency: ['Injured', 'Stranded', 'Lost', 'Other personal assistance'],
  'Request resources': ['Food or water', 'Shelter', 'Transport'],
};

export default function MapScreen() {
  const app = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDangerId, setSelectedDangerId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState<Coordinate | null>(null);
  const [safeRoute, setSafeRoute] = useState<SafeRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [helpKind, setHelpKind] = useState<HelpKind | null>(null);
  const [request, setRequest] = useState('');
  const [details, setDetails] = useState('');
  const [requestLocation, setRequestLocation] = useState<ApproximateLocation | null>(null);
  const [dangerZones, setDangerZones] = useState(demonstrationDangerZones);
  const [sites, setSites] = useState(emergencySites);
  const [helpOffers, setHelpOffers] = useState<MapHelpOffer[]>(demonstrationHelpOffers);
  const [allIncidents, setAllIncidents] = useState(demonstrationIncidents);
  const [mapLocation, setMapLocation] = useState<Coordinate>(mock.me);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incidentPhotos, setIncidentPhotos] = useState<{ uri: string; data: string }[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    api.getMap().then((snapshot: MapSnapshot) => {
      if (!active) return;
      setDangerZones(withDemonstrationHazards(snapshot.dangerZones));
      const mapSites = withDemonstrationSites(toMapSites(snapshot));
      setSites(mapSites);
      setHelpOffers(snapshot.helpFeed.flatMap((item) => {
        const location = item.approximateLocation;
        if (item.type !== 'offer' || item.isMine || location?.latitude == null || location.longitude == null) return [];
        return [{ id: item.id, title: item.title, description: item.description, author: item.author, distance: item.distance, coordinate: { latitude: location.latitude, longitude: location.longitude } }];
      }));
      setAllIncidents(snapshot.incidents.map((item) => ({
        id: item.id,
        category: item.category,
        description: item.description,
        approximateLocation: item.approximateLocation,
        submittedAt: item.submittedAt,
        updatedAt: item.updatedAt,
        source: item.source,
        verificationStatus: item.verificationStatus,
        incidentStatus: item.status,
      })));
    }).catch(() => {
      if (!active) return;
      setDangerZones(demonstrationDangerZones);
      setSites(emergencySites);
      setHelpOffers(demonstrationHelpOffers);
      setAllIncidents(demonstrationIncidents);
    });
    return () => { active = false; };
  }, []));

  useEffect(() => {
    let active = true;

    async function loadMapLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setMapLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      } catch {
        // Keep the clearly visible demonstration fallback if a location is unavailable.
      }
    }

    void loadMapLocation();
    return () => { active = false; };
  }, []);

  const incidents = allIncidents;
  const nearestSafe = useMemo(() => nearestSafeSite(sites, mapLocation), [mapLocation, sites]);
  const mapNearbyPeople = useMemo(() => nearbyPeople.map((person) => ({
    ...person,
    coordinate: {
      latitude: mapLocation.latitude + person.coordinate.latitude - mock.me.latitude,
      longitude: mapLocation.longitude + person.coordinate.longitude - mock.me.longitude,
    },
  })), [mapLocation]);
  async function calculateRoute(start: Coordinate, destination: Coordinate) {
    if (app.offline) {
      setRouteError('Offline — reconnect to calculate a road route.');
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    try {
      setSafeRoute(await requestSafeRoadRoute(start, destination, dangerZones));
    } catch {
      setRouteError('No verified safe road route is available. Choose another destination or try again shortly.');
    } finally {
      setRouteLoading(false);
    }
  }

  async function submitHelpRequest() {
    if (!helpKind || !requestLocation || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const approximateLocation = requestLocation;
    let submitted = false;
    let photoUploadFailed = false;
    try {
      if (helpKind === 'Request resources') {
        await api.createHelpRequest({ kind: 'resource', title: request || undefined, categories: [request || 'Other practical help'], description: details, approximateLocation });
        submitted = true;
      } else {
        const personalCategories: PersonalHelpCategory[] = ['Injured', 'Stranded', 'Lost', 'Other personal assistance'];
        const category: PersonalHelpCategory = personalCategories.includes(request as PersonalHelpCategory)
          ? request as PersonalHelpCategory
          : 'Other personal assistance';
        const description = details.trim() || (category === 'Other personal assistance' && request.trim() ? request.trim() : `Needs help: ${category.toLowerCase()}`);
        const incident = await api.createIncident({ category, description, approximateLocation, shareWithAuthorities: true });
        submitted = true;
        for (const photo of incidentPhotos) {
          try { await api.uploadIncidentPhoto(incident.id, photo.data); } catch { photoUploadFailed = true; }
        }
      }
      setHelpMenuOpen(false);
      setIncidentPhotos([]);
      if (helpKind !== 'Request resources') app.setSos(true);
      try {
        const snapshot = await api.getMap();
        setDangerZones(withDemonstrationHazards(snapshot.dangerZones));
        const mapSites = withDemonstrationSites(toMapSites(snapshot));
        setSites(mapSites);
        setAllIncidents(snapshot.incidents.map((item) => ({ id: item.id, category: item.category, description: item.description, approximateLocation: item.approximateLocation, submittedAt: item.submittedAt, updatedAt: item.updatedAt, source: item.source, verificationStatus: item.verificationStatus, incidentStatus: item.status })));
      } catch { /* The submission succeeded; keep the currently loaded map. */ }
      if (photoUploadFailed) Alert.alert('Report sent', 'Your report was received, but one or more photos could not be uploaded.');
    } catch (error) {
      if (submitted) {
        setHelpMenuOpen(false);
        setIncidentPhotos([]);
        if (helpKind !== 'Request resources') app.setSos(true);
        Alert.alert('Request sent', 'Your request was received. The map could not refresh.');
      } else {
        setSubmitError(error instanceof Error ? error.message : 'Could not send the request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function addIncidentPhotos() {
    const remaining = 3 - incidentPhotos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8, base64: true });
    if (result.canceled) return;
    const tooLarge = result.assets.some((asset) => asset.fileSize && asset.fileSize > 5 * 1024 * 1024);
    if (tooLarge) Alert.alert('Photo too large', 'Choose photos smaller than 5 MB each.');
    const accepted = result.assets.filter((asset) => (!asset.fileSize || asset.fileSize <= 5 * 1024 * 1024) && !!asset.base64);
    setIncidentPhotos((current) => [...current, ...accepted.map((asset) => ({ uri: asset.uri, data: `data:image/jpeg;base64,${asset.base64}` }))].slice(0, 3));
  }

  async function openHelpMenu() {
    setHelpMenuOpen(true);
    setRequestLocation(null);
  }

  return (
    <View style={styles.root}>
      <TacticalMap
        shelling={app.shelling}
        sos={app.sos}
        route={app.route}
        showBasement={app.p2pReceived}
        showCommunityReports
        offline={app.offline}
        dangerZones={dangerZones}
        emergencySites={sites}
        nearbyPeople={mapNearbyPeople}
        userLocation={mapLocation}
        helpOffers={helpOffers}
        plannedRoute={safeRoute?.coordinates}
        destination={customDestination ?? undefined}
        incidents={incidents}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId((current) => current === id ? null : id);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
        }}
        onSelectDanger={(id) => {
          setSelectedDangerId((current) => current === id ? null : id);
          setSelectedId(null);
          setSelectedSiteId(null);
        }}
        onSelectSite={(id) => {
          setSelectedSiteId((current) => current === id ? null : id);
          setSelectedId(null);
          setSelectedDangerId(null);
        }}
        onDestinationLongPress={(coordinate) => {
          setCustomDestination(coordinate);
          setSafeRoute(null);
          setRouteError(null);
          setSelectedId(null);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
          void calculateRoute(mapLocation, coordinate);
        }}
      />

      <Pressable onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Account" style={styles.accountButton}>
        <Ionicons name="person-circle-outline" size={26} color={colors.text} />
      </Pressable>

      <View style={styles.bottom} pointerEvents="box-none">
        {!app.sos && (
          <View style={styles.sosRow} pointerEvents="box-none">
            <NeedHelpButton onPress={openHelpMenu} />
          </View>
        )}
        <BottomCard
          selectedIncident={allIncidents.find((incident) => incident.id === selectedId)}
          selectedDanger={dangerZones.find((zone) => zone.id === selectedDangerId)}
          selectedSite={sites.find((site) => site.id === selectedSiteId)}
          safeRoute={safeRoute}
          routeLoading={routeLoading}
          routeError={routeError}
          nearestSafe={nearestSafe}
          onPlanNearest={() => {
            if (!nearestSafe) return;
            setSafeRoute(null);
            setRouteError(null);
            void calculateRoute(mapLocation, nearestSafe.site.coordinate);
          }}
          onPlanSite={(site) => {
            setSafeRoute(null);
            setRouteError(null);
            void calculateRoute(mapLocation, site.coordinate);
          }}
          onCloseRoute={() => {
            setSafeRoute(null);
            setRouteError(null);
            setCustomDestination(null);
          }}
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
            {helpKind && <View style={styles.quickChoices}>{helpKinds[helpKind].map((example) => <Pressable key={example} onPress={() => setRequest(example)} style={[styles.quickChoice, request === example && styles.quickChoiceActive]}><Text style={styles.quickChoiceText}>{example}</Text></Pressable>)}</View>}
            {helpKind && <TextInput value={request} onChangeText={setRequest} placeholder={helpKind === 'Emergency' ? 'Describe the help you need (optional)' : 'Other resource or request (optional)'} placeholderTextColor={colors.textDim} style={styles.input} />}
            <ApproximateLocationPicker value={requestLocation} onChange={setRequestLocation} />
            <Text style={styles.kicker}>ADDITIONAL DETAILS (OPTIONAL)</Text><TextInput value={details} onChangeText={setDetails} placeholder="What help do you need?" placeholderTextColor={colors.textDim} style={[styles.input, styles.detailsInput]} multiline textAlignVertical="top" />
            {helpKind !== 'Request resources' && <View style={styles.photoField}><Text style={styles.kicker}>PHOTOS (OPTIONAL · UP TO 3)</Text><Button label="Add photos" icon="image-outline" color={colors.blue} outline onPress={() => { void addIncidentPhotos(); }} /><View style={styles.photoRow}>{incidentPhotos.map((photo) => <Pressable key={photo.uri} onPress={() => setIncidentPhotos((current) => current.filter((item) => item.uri !== photo.uri))} accessibilityRole="button" accessibilityLabel="Remove photo"><Image source={{ uri: photo.uri }} style={styles.photoPreview} /></Pressable>)}</View></View>}
            <Text style={styles.disclaimer}>Your request will be shared with the SafeTogether community. Incident reports are also available to authorities. For immediate danger, call local emergency services.</Text>
            {submitError && <Text accessibilityRole="alert" style={styles.submitError}>{submitError}</Text>}
            <Button label={submitting ? 'Sending…' : 'Send help request'} icon="send" disabled={!helpKind || submitting || !requestLocation} onPress={() => { void submitHelpRequest(); }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function toMapSites(snapshot: MapSnapshot): EmergencySite[] {
  const rendezvous = snapshot.rendezvousPoints.flatMap((point) => {
    const { latitude, longitude } = point.location;
    if (latitude === undefined || longitude === undefined) return [];
    return [{ id: point.id, kind: 'safe_zone' as const, title: point.title, summary: point.instructions, coordinate: { latitude, longitude } }];
  });
  return [...snapshot.emergencySites, ...rendezvous];
}

/** Keep the requested demonstration hazards visible when the API returns its own map snapshot. */
function withDemonstrationHazards(remoteZones: MapSnapshot['dangerZones']): DangerZone[] {
  const demonstrationIds = new Set(demonstrationDangerZones.map((zone) => zone.id));
  return [...demonstrationDangerZones, ...remoteZones.filter((zone) => !demonstrationIds.has(zone.id))];
}

/** Keep the demonstration shelter on the map when the API snapshot has no emergency sites. */
function withDemonstrationSites(remoteSites: EmergencySite[]): EmergencySite[] {
  const demonstrationIds = new Set(emergencySites.map((site) => site.id));
  return [...emergencySites, ...remoteSites.filter((site) => !demonstrationIds.has(site.id))];
}

function nearestSafeSite(sites: EmergencySite[], from: Coordinate) {
  const safeSites = sites.filter((site) => site.kind === 'safe_zone' || site.kind === 'shelter');
  return safeSites.reduce<{ site: EmergencySite; distanceKm: number } | null>((nearest, site) => {
    const distanceKm = distanceInKm(from, site.coordinate);
    return !nearest || distanceKm < nearest.distanceKm ? { site, distanceKm } : nearest;
  }, null);
}

function distanceInKm(from: Coordinate, to: Coordinate) {
  const latitude = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitude = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a = Math.sin(latitude / 2) ** 2 + Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function BottomCard({
  selectedIncident,
  selectedDanger,
  selectedSite,
  safeRoute,
  routeLoading,
  routeError,
  nearestSafe,
  onPlanNearest,
  onPlanSite,
  onCloseRoute,
  onClose,
}: {
  selectedIncident?: Incident;
  selectedDanger?: DangerZone;
  selectedSite?: EmergencySite;
  safeRoute: SafeRoute | null;
  routeLoading: boolean;
  routeError: string | null;
  nearestSafe: { site: EmergencySite; distanceKm: number } | null;
  onPlanNearest: () => void;
  onPlanSite: (site: EmergencySite) => void;
  onCloseRoute: () => void;
  onClose: () => void;
}) {
  const app = useApp();
  const incident = selectedIncident;

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

  if (routeLoading || safeRoute || routeError) {
    return (
      <Animated.View entering={FadeInDown} key="safe-route">
        <Card style={{ borderLeftWidth: 5, borderLeftColor: routeError ? colors.red : colors.green }}>
          <View style={styles.row}>
            <View style={[styles.incidentIcon, { backgroundColor: routeError ? colors.red : colors.green }]}>
              <Ionicons name={routeLoading ? 'hourglass' : routeError ? 'alert' : 'navigate'} size={21} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: routeError ? colors.red : colors.green }]}>{routeLoading ? 'FINDING SAFE ROUTE' : routeError ? 'ROUTE UNAVAILABLE' : 'SAFE ROUTE ACTIVE'}</Text>
              <Text style={styles.title}>{routeLoading ? 'Finding the shortest safe route…' : routeError ? 'Could not calculate a route' : 'Shortest route ready'}</Text>
            </View>
            <Pressable onPress={onCloseRoute} accessibilityRole="button" accessibilityLabel="Close route" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
          </View>
          {safeRoute && <Text style={styles.body}>{safeRoute.distanceKm.toFixed(1)} km · {safeRoute.durationMinutes} min · avoids {safeRoute.avoidedZoneIds.length} danger zone{safeRoute.avoidedZoneIds.length === 1 ? '' : 's'}</Text>}
          {routeError && <Text style={styles.routeError}>{routeError}</Text>}
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
              <Ionicons name={selectedDanger.kind === 'fire' ? 'flame' : selectedDanger.kind === 'flooding' ? 'water' : selectedDanger.kind === 'riot' ? 'people' : 'warning'} size={21} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color }]}>ACTIVE DANGER · {selectedDanger.severity.toUpperCase()}</Text>
              <Text style={styles.title}>{selectedDanger.title}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
          </View>
          <Text style={styles.body}>{selectedDanger.summary}</Text>
          <Text style={[styles.dangerInstruction, { color }]}>{dangerAction(selectedDanger)}</Text>
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
          <Button icon="navigate" label="Plan safe route here" color={colors.green} onPress={() => onPlanSite(selectedSite)} />
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
            <Info icon="information-circle" text={incident.incidentStatus.replace('_', ' ')} />
          </View>
          <View style={styles.row}>
            <Info icon="location" text={`Approx. ${incident.approximateLocation.label}`} />
            <Info icon="time" text={formatIncidentTime(incident.submittedAt)} />
          </View>
          {incident.source === 'authority' && <Text style={styles.muted}>Submitted by an authority</Text>}
          {guide && <Button icon="book" label="Open safety guide" color={colors.blue} outline onPress={() => router.push(`/guide/${guide}`)} />}
        </Card>
      </Animated.View>
    );
  }

  if (!nearestSafe) return null;
  const { site, distanceKm } = nearestSafe;
  return (
    <Animated.View entering={FadeInDown} key={site.id}>
      <Card>
        <Text style={[styles.kicker, { color: colors.green }]}>NEAREST SAFE PLACE</Text>
        <Text style={styles.title}>{site.title}</Text>
        <View style={styles.row}>
          <Info icon="navigate" text={`${distanceKm.toFixed(1)} km away`} />
          {site.capacity && <Info icon="people" text={site.capacity} />}
        </View>
        <Text style={styles.muted}>{site.summary}</Text>
        <Button icon="navigate" label="Route to safe place" color={colors.green} onPress={onPlanNearest} />
      </Card>
    </Animated.View>
  );
}

function dangerColor(zone: DangerZone) {
  return zone.kind === 'flooding' ? colors.violet : zone.kind === 'fire' ? '#F04438' : zone.kind === 'riot' ? colors.orange : colors.red;
}

function siteColor(site: EmergencySite) {
  return site.kind === 'shelter' ? colors.green : site.kind === 'aid' ? colors.orange : colors.blue;
}

function formatIncidentTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function dangerAction(zone: DangerZone) {
  if (zone.kind === 'attack') return 'Take cover. Avoid the area.';
  if (zone.kind === 'fire') return 'Avoid smoke and leave room for responders.';
  if (zone.kind === 'flooding') return 'Do not cross this road or underpass.';
  return 'Avoid the area and follow police instructions.';
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
  accountButton: { position: 'absolute', top: 12, right: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.card },
  routeError: { color: colors.red, fontSize: 12, fontWeight: '700' },
  dangerInstruction: { fontSize: 13, fontWeight: '800' },
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
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.bg, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  detailsInput: { minHeight: 92 },
  disclaimer: { color: colors.orange, backgroundColor: colors.orangeSoft, borderRadius: radius.md, padding: 10, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  submitError: { color: colors.red, fontSize: 13, fontWeight: '700' },
  photoField: { gap: 8 },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoPreview: { width: 60, height: 60, borderRadius: radius.sm },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textDim },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
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
