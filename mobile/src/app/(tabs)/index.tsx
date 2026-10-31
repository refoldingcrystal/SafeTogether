import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { TacticalMap } from '@/components/TacticalMap';
import { CoordinationChat, type CoordinationRequest } from '@/components/CoordinationChat';
import { Button, Card, NeedHelpButton } from '@/components/ui';
import mock from '@/data/mock.json';
import { offlineDemoPlaces, offlineDemoRoads } from '@/data/offlineMapDemo';
import { categoryIcons, incidentColors } from '@/icons';
import { demonstrationDangerZones, demonstrationHelpOffers, demonstrationIncidents, emergencySites, nearbyPeople, type Coordinate, type DangerZone, type EmergencySite, type MapHelpOffer } from '@/shared/demo';
import { api, type MapSnapshot } from '@/services/api';
import { offlineMapSnapshotStore, type OfflineMapSnapshot } from '@/services/offlineMapSnapshotStore';
import type { Incident, PersonalHelpCategory } from '@/shared/models';
import { getApproximateCurrentLocation } from '@/shared/location';
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
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState<Coordinate | null>(null);
  const [safeRoute, setSafeRoute] = useState<SafeRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapSnapshotSavedAt, setMapSnapshotSavedAt] = useState<string | null>(null);
  const [mapQuery, setMapQuery] = useState('');
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationStep, setNavigationStep] = useState(0);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [helpKind, setHelpKind] = useState<HelpKind | null>(null);
  const [request, setRequest] = useState('');
  const [details, setDetails] = useState('');
  const [dangerZones, setDangerZones] = useState(demonstrationDangerZones);
  const [sites, setSites] = useState(emergencySites);
  const [helpOffers, setHelpOffers] = useState<MapHelpOffer[]>(demonstrationHelpOffers);
  const [allIncidents, setAllIncidents] = useState(demonstrationIncidents);
  const [mapLocation, setMapLocation] = useState<Coordinate>(mock.me);
  const [submitting, setSubmitting] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [markingSafe, setMarkingSafe] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const applyMapSnapshot = useCallback((snapshot: OfflineMapSnapshot) => {
    setDangerZones(withDemonstrationHazards(snapshot.dangerZones));
    setSites(withDemonstrationSites(toMapSites(snapshot)));
    setHelpOffers(snapshot.helpFeed.flatMap((item) => {
      const location = item.approximateLocation;
      if (item.type !== 'offer' || item.isMine || location?.latitude == null || location.longitude == null) return [];
      return [{ id: item.id, title: item.title, description: item.description, author: item.author, distance: item.distance, coordinate: { latitude: location.latitude, longitude: location.longitude } }];
    }));
    setAllIncidents(snapshot.incidents.map((item) => ({
      id: item.id,
      reporterName: item.reporterName,
      category: item.category,
      description: item.description,
      approximateLocation: item.approximateLocation,
      submittedAt: item.submittedAt,
      updatedAt: item.updatedAt,
      source: item.source,
      verificationStatus: item.verificationStatus,
    })));
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (app.offline) {
      offlineMapSnapshotStore.load().then((saved) => {
        if (!active) return;
        if (saved) {
          applyMapSnapshot(saved.snapshot);
          setMapSnapshotSavedAt(saved.savedAt);
        } else {
          setDangerZones(demonstrationDangerZones);
          setSites(offlineDemoPlaces);
          setHelpOffers(demonstrationHelpOffers);
          setAllIncidents(demonstrationIncidents);
          setMapSnapshotSavedAt(null);
        }
        if (app.offlineSource === 'demo') setMapLocation(mock.me);
      }).catch(() => undefined);
      return () => { active = false; };
    }
    api.getMap().then((snapshot: MapSnapshot) => {
      if (!active) return;
      applyMapSnapshot(snapshot);
      void offlineMapSnapshotStore.save(snapshot).then(setMapSnapshotSavedAt).catch(() => undefined);
    }).catch(async () => {
      if (!active) return;
      const saved = await offlineMapSnapshotStore.load();
      if (!active) return;
      if (saved) {
        applyMapSnapshot(saved.snapshot);
        setMapSnapshotSavedAt(saved.savedAt);
      } else {
        setDangerZones(demonstrationDangerZones);
        setSites(emergencySites);
        setHelpOffers(demonstrationHelpOffers);
        setAllIncidents(demonstrationIncidents);
      }
    });
    return () => { active = false; };
  }, [app.offline, app.offlineSource, applyMapSnapshot]));

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

  const [activeChat, setActiveChat] = useState<CoordinationRequest | null>(null);

  const incidents = allIncidents;
  const nearestSafe = useMemo(() => nearestSafeSite(sites, mapLocation), [mapLocation, sites]);
  const mapNearbyPeople = useMemo(() => nearbyPeople.map((person) => ({
    ...person,
    coordinate: {
      latitude: mapLocation.latitude + person.coordinate.latitude - mock.me.latitude,
      longitude: mapLocation.longitude + person.coordinate.longitude - mock.me.longitude,
    },
  })), [mapLocation]);
  const matchingOfflinePlaces = useMemo(() => {
    const savedPlaces = sites.map((site) => ({ ...site, searchText: `${site.title} ${site.summary}` }));
    const placesById = new Map([...savedPlaces, ...offlineDemoPlaces].map((place) => [place.id, place] as const));
    return [...placesById.values()]
      .filter((place) => `${place.title} ${place.summary} ${place.searchText ?? ''}`.toLowerCase().includes(mapQuery.trim().toLowerCase()))
      .slice(0, 5);
  }, [mapQuery, sites]);

  async function calculateRoute(start: Coordinate, destination: Coordinate, destinationId?: string) {
    if (app.offline) {
      setRouteError(null);
      setSafeRoute(null);
      setNavigationActive(false);
      setNavigationStep(0);
      const place = offlineDemoPlaces.find((item) => item.id === destinationId);
      if (!place) {
        setRouteError('Offline, routes go to saved places only.');
        return;
      }
      setSafeRoute({ ...place.route, demo: true });
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

  function selectOfflinePlace(placeId: string) {
    const place = offlineDemoPlaces.find((item) => item.id === placeId);
    const savedPlace = sites.find((item) => item.id === placeId);
    const title = place?.title ?? savedPlace?.title;
    if (!title) return;
    setMapQuery(title);
    setMapSearchOpen(false);
    setSelectedId(null);
    setSelectedDangerId(null);
    setSelectedSiteId(placeId);
    setSafeRoute(null);
    setRouteError(null);
    setNavigationActive(false);
  }

  async function submitHelpRequest() {
    if (!helpKind || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    let submitted = false;
    try {
      if (app.offline) {
        const packetKind = helpKind === 'Emergency' ? 'sos' : 'need';
        const summary = (details || request || helpKind).trim();
        // setSos queues the SOS itself while offline.
        if (helpKind === 'Emergency') app.setSos(true);
        else app.enqueue(packetKind, `${packetKind.toUpperCase()} · ${summary}`);
        setHelpMenuOpen(false);
        router.navigate('/mesh');
        Alert.alert('Sent to phones nearby', 'Your request will be passed to nearby phones.');
        return;
      }
      const approximateLocation = await getApproximateCurrentLocation();
      if (helpKind === 'Request resources') {
        await api.createHelpRequest({ kind: 'resource', title: request || undefined, categories: [request || 'Other practical help'], description: details, approximateLocation });
        submitted = true;
      } else {
        const personalCategories: PersonalHelpCategory[] = ['Injured', 'Stranded', 'Lost', 'Other personal assistance'];
        const category: PersonalHelpCategory = personalCategories.includes(request as PersonalHelpCategory)
          ? request as PersonalHelpCategory
          : 'Other personal assistance';
        const description = details.trim();
        const incident = await api.createIncident({ category, description, approximateLocation, shareWithAuthorities: true });
        setActiveIncidentId(incident.id);
        submitted = true;
      }
      setHelpMenuOpen(false);
      if (helpKind !== 'Request resources') app.setSos(true);
      try {
        const snapshot = await api.getMap();
        setDangerZones(withDemonstrationHazards(snapshot.dangerZones));
        const mapSites = withDemonstrationSites(toMapSites(snapshot));
        setSites(mapSites);
        setAllIncidents(snapshot.incidents.map((item) => ({ id: item.id, reporterName: item.reporterName, category: item.category, description: item.description, approximateLocation: item.approximateLocation, submittedAt: item.submittedAt, updatedAt: item.updatedAt, source: item.source, verificationStatus: item.verificationStatus })));
      } catch { /* The submission succeeded; keep the currently loaded map. */ }
    } catch (error) {
      if (submitted) {
        setHelpMenuOpen(false);
        if (helpKind !== 'Request resources') app.setSos(true);
        Alert.alert('Request sent', 'Your request was received. The map could not refresh.');
      } else {
        setSubmitError(error instanceof Error ? error.message : 'Could not send the request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openHelpMenu() {
    setHelpMenuOpen(true);
  }

  async function markSafe() {
    if (markingSafe) return;
    setMarkingSafe(true);
    try {
      if (activeIncidentId) {
        await api.deleteIncident(activeIncidentId);
        setAllIncidents((current) => current.filter((incident) => incident.id !== activeIncidentId));
        setSelectedId((current) => current === activeIncidentId ? null : current);
      }
      setActiveIncidentId(null);
      app.setSos(false);
    } catch (error) {
      Alert.alert('Could not close help request', error instanceof Error ? error.message : 'Please try again when you have a connection.');
    } finally {
      setMarkingSafe(false);
    }
  }

  return (
    <View style={styles.root}>
      <TacticalMap
        shelling={app.shelling}
        sos={app.sos}
        route={app.route}
        showBasement={false}
        showCommunityReports
        offline={app.offline}
        offlineMapReady
        offlineDemoRoads={app.offline ? offlineDemoRoads : []}
        dangerZones={dangerZones}
        emergencySites={sites}
        nearbyPeople={mapNearbyPeople}
        userLocation={app.offlineSource === 'demo' ? mock.me : mapLocation}
        helpOffers={helpOffers}
        plannedRoute={safeRoute?.coordinates}
        destination={customDestination ?? undefined}
        incidents={incidents}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId((current) => current === id ? null : id);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
          setSelectedOfferId(null);
        }}
        onSelectDanger={(id) => {
          setSelectedDangerId((current) => current === id ? null : id);
          setSelectedId(null);
          setSelectedSiteId(null);
          setSelectedOfferId(null);
        }}
        onSelectSite={(id) => {
          setSelectedSiteId((current) => current === id ? null : id);
          setSelectedId(null);
          setSelectedDangerId(null);
          setSelectedOfferId(null);
        }}
        onSelectOffer={(id) => {
          setSelectedOfferId((current) => current === id ? null : id);
          setSelectedId(null);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
        }}
        onDestinationLongPress={(coordinate) => {
          if (app.offline) {
            setRouteError('Offline, routes go to saved places only.');
            setSafeRoute(null);
            return;
          }
          setCustomDestination(coordinate);
          setSafeRoute(null);
          setRouteError(null);
          setSelectedId(null);
          setSelectedDangerId(null);
          setSelectedSiteId(null);
          setSelectedOfferId(null);
          void calculateRoute(mapLocation, coordinate);
        }}
      />

      <View style={styles.mapTools}>
        {app.offline && (
          <View style={styles.offlineNotice} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={16} color={colors.orange} />
            <Text style={styles.offlineNoticeTitle}>
              Offline · saved map{mapSnapshotSavedAt ? ` from ${new Date(mapSnapshotSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </Text>
          </View>
        )}
        {app.offline && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={mapQuery}
              onChangeText={(value) => { setMapQuery(value); setMapSearchOpen(true); }}
              onFocus={() => setMapSearchOpen(true)}
              placeholder="Search places"
              placeholderTextColor={colors.textDim}
              style={styles.mapSearchInput}
              accessibilityLabel="Search saved offline map"
            />
            {!!mapQuery && <Pressable onPress={() => setMapQuery('')} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color={colors.textDim} /></Pressable>}
          </View>
        )}
        {app.offline && mapSearchOpen && !!mapQuery.trim() && (
          <View style={styles.searchResults}>
            {matchingOfflinePlaces.length ? matchingOfflinePlaces.map((place) => (
              <Pressable key={place.id} onPress={() => selectOfflinePlace(place.id)} style={styles.searchResult}>
                <Ionicons name={place.kind === 'shelter' ? 'home' : place.kind === 'aid' ? 'medkit' : 'shield-checkmark'} size={17} color={colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultTitle}>{place.title}</Text>
                  <Text style={styles.searchResultMeta}>{place.summary}</Text>
                </View>
              </Pressable>
            )) : <Text style={styles.searchResultMeta}>No places found.</Text>}
          </View>
        )}
      </View>

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
          selectedSite={sites.find((site) => site.id === selectedSiteId) ?? offlineDemoPlaces.find((site) => site.id === selectedSiteId)}
          selectedOffer={helpOffers.find((offer) => offer.id === selectedOfferId)}
          safeRoute={safeRoute}
          routeLoading={routeLoading}
          routeError={routeError}
          nearestSafe={nearestSafe}
          markingSafe={markingSafe}
          onMarkSafe={() => { void markSafe(); }}
          onPlanNearest={() => {
            if (!nearestSafe) return;
            setSafeRoute(null);
            setRouteError(null);
            void calculateRoute(mapLocation, nearestSafe.site.coordinate, nearestSafe.site.id);
          }}
          onPlanSite={(site) => {
            setSafeRoute(null);
            setRouteError(null);
            void calculateRoute(mapLocation, site.coordinate, site.id);
          }}
          onCloseRoute={() => {
            setSafeRoute(null);
            setRouteError(null);
            setCustomDestination(null);
            setNavigationActive(false);
          }}
        onChat={(incident) => setActiveChat({ id: incident.id, author: incident.reporterName, title: incident.category })}
          onChatOffer={(offer) => setActiveChat({ id: offer.id, author: offer.author, title: offer.title })}
          navigationActive={navigationActive}
          navigationStep={navigationStep}
          onStartNavigation={() => { setNavigationStep(0); setNavigationActive(true); }}
          onNextNavigationStep={() => {
            if (navigationStep >= (safeRoute?.navigationSteps?.length ?? 1) - 1) setNavigationActive(false);
            else setNavigationStep((step) => step + 1);
          }}
          onEndNavigation={() => setNavigationActive(false)}
          onClose={() => {
            setSelectedId(null);
            setSelectedDangerId(null);
            setSelectedSiteId(null);
            setSelectedOfferId(null);
          }}
        />
      </View>
      <CoordinationChat request={activeChat} onClose={() => setActiveChat(null)} />
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
            <Text style={styles.muted}>We’ll use your current location, shifted randomly by up to 500 m.</Text>
            <Text style={styles.kicker}>ADDITIONAL DETAILS (OPTIONAL)</Text><TextInput value={details} onChangeText={setDetails} placeholder="What help do you need?" placeholderTextColor={colors.textDim} style={[styles.input, styles.detailsInput]} multiline textAlignVertical="top" />
            <Text style={styles.disclaimer}>Your request will be shared with the SafeTogether community. Incident reports are also available to authorities. For immediate danger, call local emergency services.</Text>
            {submitError && <Text accessibilityRole="alert" style={styles.submitError}>{submitError}</Text>}
            <Button label={submitting ? 'Sending…' : 'Send help request'} icon="send" disabled={!helpKind || submitting} onPress={() => { void submitHelpRequest(); }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function toMapSites(snapshot: Pick<MapSnapshot, 'emergencySites' | 'rendezvousPoints'>): EmergencySite[] {
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

function NavigationPanel({ route, step, onNext, onEnd }: { route: SafeRoute; step: number; onNext: () => void; onEnd: () => void }) {
  const steps = route.navigationSteps ?? [];
  const currentStep = Math.min(step, Math.max(steps.length - 1, 0));
  return (
    <Animated.View entering={FadeInDown} key="offline-navigation">
      <Card style={{ borderWidth: 2, borderColor: colors.green }}>
        <Text style={[styles.kicker, { color: colors.green }]}>OFFLINE NAVIGATION · STEP {currentStep + 1} OF {steps.length}</Text>
        <Text style={styles.title}>{steps[currentStep]}</Text>
        <Text style={styles.muted}>Route · {route.distanceKm.toFixed(1)} km · {route.durationMinutes} min</Text>
        <Button icon={currentStep + 1 === steps.length ? 'checkmark' : 'arrow-forward'} label={currentStep + 1 === steps.length ? 'Finish navigation' : 'Next direction'} color={colors.green} onPress={onNext} />
        <Button label="End navigation" color={colors.textMuted} outline onPress={onEnd} />
      </Card>
    </Animated.View>
  );
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
  selectedOffer,
  safeRoute,
  routeLoading,
  routeError,
  nearestSafe,
  markingSafe,
  onMarkSafe,
  onPlanNearest,
  onPlanSite,
  onCloseRoute,
  onChat,
  onChatOffer,
  navigationActive,
  navigationStep,
  onStartNavigation,
  onNextNavigationStep,
  onEndNavigation,
  onClose,
}: {
  selectedIncident?: Incident;
  selectedDanger?: DangerZone;
  selectedSite?: EmergencySite;
  selectedOffer?: MapHelpOffer;
  safeRoute: SafeRoute | null;
  routeLoading: boolean;
  routeError: string | null;
  nearestSafe: { site: EmergencySite; distanceKm: number } | null;
  markingSafe: boolean;
  onMarkSafe: () => void;
  onPlanNearest: () => void;
  onPlanSite: (site: EmergencySite) => void;
  onCloseRoute: () => void;
  onChat: (incident: Incident) => void;
  onChatOffer: (offer: MapHelpOffer) => void;
  navigationActive: boolean;
  navigationStep: number;
  onStartNavigation: () => void;
  onNextNavigationStep: () => void;
  onEndNavigation: () => void;
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
              <Text style={styles.muted}>This screen does not contact emergency services or notify other people.</Text>
            </View>
          </View>
          <Button icon="shield-checkmark" label={markingSafe ? 'Closing request…' : 'I am safe'} color={colors.green} disabled={markingSafe} onPress={onMarkSafe} />
        </Card>
      </Animated.View>
    );
  }

  if (navigationActive && safeRoute?.navigationSteps?.length) {
    return <NavigationPanel route={safeRoute} step={navigationStep} onNext={onNextNavigationStep} onEnd={onEndNavigation} />;
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
              <Text style={[styles.kicker, { color: routeError ? colors.red : colors.green }]}>{routeLoading ? 'FINDING SAFE ROUTE' : routeError ? 'ROUTE UNAVAILABLE' : safeRoute?.demo ? 'OFFLINE ROUTE' : 'SAFE ROUTE ACTIVE'}</Text>
              <Text style={styles.title}>{routeLoading ? 'Finding the shortest safe route…' : routeError ? 'Could not calculate a route' : safeRoute?.demo ? 'Saved route ready' : 'Shortest route ready'}</Text>
            </View>
            <Pressable onPress={onCloseRoute} accessibilityRole="button" accessibilityLabel="Close route" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
          </View>
          {safeRoute && <Text style={styles.body}>{safeRoute.distanceKm.toFixed(1)} km · {safeRoute.durationMinutes} min{safeRoute.avoidedZoneIds.length ? ` · avoids ${safeRoute.avoidedZoneIds.length} saved danger zone${safeRoute.avoidedZoneIds.length === 1 ? '' : 's'}` : ''}</Text>}
          {safeRoute?.navigationSteps?.length ? <Button icon="navigate" label="Start navigation" color={colors.green} onPress={onStartNavigation} /> : null}
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

  if (selectedOffer) {
    return (
      <Animated.View entering={FadeInDown} key={selectedOffer.id}>
        <Card style={{ borderLeftWidth: 5, borderLeftColor: colors.green }}>
          <View style={styles.row}>
            <View style={[styles.incidentIcon, { backgroundColor: colors.green }]}>
              <Ionicons name="hand-left" size={21} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.green }]}>HELP OFFER</Text>
              <Text style={styles.title}>{selectedOffer.title}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Ionicons name="close" size={22} color={colors.textDim} /></Pressable>
          </View>
          <Text style={styles.muted}>Offered by {selectedOffer.author} · {selectedOffer.distance}</Text>
          {selectedOffer.description && <Text style={styles.body}>{selectedOffer.description}</Text>}
          <Button icon="chatbubble-ellipses" label="Chat" color={colors.blue} onPress={() => onChatOffer(selectedOffer)} />
        </Card>
      </Animated.View>
    );
  }

  if (incident) {
    const color = incidentColors[incident.category] ?? colors.blue;
    return (
      <Animated.View entering={FadeInDown} key={incident.id}>
        <Card>
          <View style={styles.row}>
            <View style={[styles.incidentIcon, { backgroundColor: color }]}>
              <Ionicons name={categoryIcons[incident.category] ?? 'alert'} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color }]}>{incident.reporterName} reported</Text>
              <Text style={styles.title}>{incident.category}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </Pressable>
          </View>
          <Text style={styles.body}>{incident.description}</Text>
          <View style={styles.row}>
            <Info icon="location" text={`Approx. ${incident.approximateLocation.label}`} />
            <Info icon="time" text={formatIncidentTime(incident.submittedAt)} />
          </View>
          {incident.source === 'authority' && <Text style={styles.muted}>Submitted by an authority</Text>}
          <Button icon="chatbubble-ellipses" label="Chat" color={colors.blue} onPress={() => onChat(incident)} />
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
  mapTools: { position: 'absolute', top: 12, left: 12, right: 62, gap: 5, zIndex: 120 },
  offlineNotice: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.orange },
  offlineNoticeTitle: { color: colors.orange, fontSize: 12, fontWeight: '800' },
  searchWrap: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 11, backgroundColor: colors.card },
  mapSearchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 },
  searchResults: { borderRadius: radius.md, padding: 9, gap: 8, backgroundColor: colors.card },
  searchResult: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  searchResultTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  searchResultMeta: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  routeError: { color: colors.red, fontSize: 12, fontWeight: '700' },
  dangerInstruction: { fontSize: 13, fontWeight: '800' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12 },
  sosRow: { alignItems: 'flex-start', marginBottom: 4 },
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
