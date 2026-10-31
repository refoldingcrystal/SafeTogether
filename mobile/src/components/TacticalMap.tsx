import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrentLocationButton } from '@/components/CurrentLocationButton';
import { MapPlaceChooser } from '@/components/MapPlaceChooser';
import MapView, { Circle, Marker, Polyline, UrlTile } from 'react-native-maps';
import { Paths } from 'expo-file-system';
import mock from '@/data/mock.json';
import { categoryIcons, incidentColors } from '@/icons';
import type { Incident } from '@/shared/models';
import type { Coordinate, DangerZone, EmergencySite, MapHelpOffer, NearbyPerson } from '@/shared/demo';
import type { Route } from '@/state/app';
import { groupMapPlaces, type MapPlaceItem } from '@/shared/mapPlaces';
import { colors, shadow } from '@/theme';

export type TacticalMapProps = {
  shelling: boolean;
  sos: boolean;
  route: Route;
  showBasement: boolean;
  showCommunityReports?: boolean;
  offline?: boolean;
  offlineMapReady?: boolean;
  offlineDemoRoads?: Coordinate[][];
  dangerZones?: DangerZone[];
  emergencySites?: EmergencySite[];
  nearbyPeople?: NearbyPerson[];
  helpOffers?: MapHelpOffer[];
  plannedRoute?: Coordinate[];
  destination?: Coordinate;
  userLocation?: Coordinate;
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectDanger?: (id: string) => void;
  onSelectSite?: (id: string) => void;
  onSelectOffer?: (id: string) => void;
  onDestinationLongPress?: (coordinate: Coordinate) => void;
};

const MAP_REGION = { latitude: 52.225, longitude: 20.995, latitudeDelta: 0.065, longitudeDelta: 0.11 };
// Tiles seen while online are kept on the phone so the map still works in an outage.
const TILE_CACHE_PATH = `${Paths.cache.uri.replace(/^file:\/\//, '')}map-tiles`;
const TILE_CACHE_MAX_AGE = 30 * 24 * 60 * 60;
const precisionRadius = { district: 450, neighborhood: 320, landmark: 200 } as const;
function incidentPoint(incident: Incident): Coordinate | null {
  const { latitude, longitude } = incident.approximateLocation;
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function regionAround(point: Coordinate, delta = 0.018) {
  return { ...point, latitudeDelta: delta, longitudeDelta: delta };
}

/** Native OpenStreetMap implementation; the web build resolves TacticalMap.web.tsx. */
export function TacticalMap({
  shelling,
  sos,
  route,
  showBasement,
  showCommunityReports = true,
  offline = false,
  offlineMapReady = false,
  offlineDemoRoads = [],
  dangerZones = [],
  emergencySites = [],
  nearbyPeople = [],
  helpOffers = [],
  plannedRoute,
  destination,
  userLocation = mock.me,
  incidents,
  selectedId,
  onSelect,
  onSelectDanger,
  onSelectSite,
  onSelectOffer,
  onDestinationLongPress,
}: TacticalMapProps) {
  const map = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [placeChoices, setPlaceChoices] = useState<MapPlaceItem[] | null>(null);
  const selected = useMemo(() => incidents.find((incident) => incident.id === selectedId), [incidents, selectedId]);
  const placeGroups = useMemo(() => {
    const items: MapPlaceItem[] = [];
    incidents.forEach((incident) => {
      const coordinate = incidentPoint(incident);
      if (coordinate) items.push({ key: `incident:${incident.id}`, kind: 'incident', id: incident.id, title: incident.category, coordinate });
    });
    dangerZones.forEach((zone) => items.push({ key: `danger:${zone.id}`, kind: 'danger', id: zone.id, title: zone.title, coordinate: zone.coordinate }));
    emergencySites.forEach((site) => items.push({ key: `site:${site.id}`, kind: 'site', id: site.id, title: site.title, coordinate: site.coordinate }));
    helpOffers.forEach((offer) => items.push({ key: `offer:${offer.id}`, kind: 'offer', id: offer.id, title: offer.title, coordinate: offer.coordinate }));
    return groupMapPlaces(items);
  }, [dangerZones, emergencySites, helpOffers, incidents]);
  const groupedKeys = useMemo(() => new Set(placeGroups.flatMap((group) => group.items.map((item) => item.key))), [placeGroups]);

  function choosePlace(item: MapPlaceItem) {
    setPlaceChoices(null);
    if (item.kind === 'incident') onSelect(item.id);
    else if (item.kind === 'danger') onSelectDanger?.(item.id);
    else if (item.kind === 'site') onSelectSite?.(item.id);
    else onSelectOffer?.(item.id);
  }

  useEffect(() => {
    const selectedPoint = selected ? incidentPoint(selected) : null;
    if (route === 'basement') {
      map.current?.fitToCoordinates(mock.basementRoute, { edgePadding: { top: 130, right: 48, bottom: 300, left: 48 }, animated: true });
    } else if (route === 'evacuation') {
      map.current?.fitToCoordinates([mock.me, mock.evacuation.coordinate], { edgePadding: { top: 130, right: 48, bottom: 300, left: 48 }, animated: true });
    } else if (shelling || sos || userLocation.latitude !== mock.me.latitude || userLocation.longitude !== mock.me.longitude) {
      map.current?.animateToRegion(regionAround(userLocation, 0.026), 650);
    } else if (selectedPoint) {
      map.current?.animateToRegion(regionAround(selectedPoint), 550);
    }
  }, [route, selected, shelling, sos, userLocation]);

  return (
    <View style={styles.root} accessibilityLabel="Map powered by OpenStreetMap">
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={MAP_REGION}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        rotateEnabled
        pitchEnabled={false}
        showsCompass
        toolbarEnabled={false}
        onLongPress={(event) => onDestinationLongPress?.(event.nativeEvent.coordinate)}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          maximumNativeZ={14}
          shouldReplaceMapContent={Platform.OS === 'ios'}
          tileCachePath={TILE_CACHE_PATH}
          tileCacheMaxAge={TILE_CACHE_MAX_AGE}
          offlineMode={offline}
          zIndex={0}
        />
        {offline && offlineMapReady && offlineDemoRoads.map((road, index) => (
          <Polyline key={`offline-road-${index}`} coordinates={road} strokeColor="#98A2B3" strokeWidth={5} zIndex={1} />
        ))}

        {showCommunityReports && incidents.map((incident) => {
          const coordinate = incidentPoint(incident);
          if (!coordinate) return null;
          const color = incidentColors[incident.category] ?? colors.blue;
          const isSelected = incident.id === selectedId;
          return (
            <Fragment key={incident.id}>
              <Circle center={coordinate} radius={precisionRadius[incident.approximateLocation.precision]} strokeColor={color} strokeWidth={isSelected ? 2.5 : 1.25} fillColor={`${color}20`} zIndex={1} />
              {!groupedKeys.has(`incident:${incident.id}`) && <Marker coordinate={coordinate} onPress={() => onSelect(incident.id)} zIndex={isSelected ? 50 : 10}>
                <View style={[styles.incidentMarker, { backgroundColor: color }, isSelected && styles.incidentMarkerSelected]}>
                  <Ionicons name={categoryIcons[incident.category] ?? 'alert'} size={16} color="#fff" />
                </View>
              </Marker>}
            </Fragment>
          );
        })}

        {dangerZones.map((zone) => {
          const color = dangerColors[zone.kind];
          const icon = dangerIcons[zone.kind];
          return (
            <Fragment key={zone.id}>
              {[1, 0.7, 0.42].map((factor) => (
                <Circle key={factor} center={zone.coordinate} radius={zone.radius * factor} strokeColor={factor === 1 ? color : 'transparent'} strokeWidth={factor === 1 ? 2 : 0} fillColor={heatColor(color, factor)} zIndex={2} />
              ))}
              {!groupedKeys.has(`danger:${zone.id}`) && <Marker coordinate={zone.coordinate} title={zone.title} description={zone.summary} onPress={() => onSelectDanger?.(zone.id)} zIndex={45}>
                <View style={[styles.dangerMarker, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={17} color="#fff" />
                  <Text style={styles.mapMarkerLabel}>{dangerLabels[zone.kind]}</Text>
                </View>
              </Marker>}
            </Fragment>
          );
        })}

        {shelling && !dangerZones.some((zone) => zone.kind === 'attack') && (
          <>
            {[1, 0.72, 0.44].map((factor) => (
              <Circle key={factor} center={mock.shelling.epicenter} radius={mock.shelling.radius * factor} strokeColor={factor === 1 ? colors.red : 'transparent'} strokeWidth={2} fillColor="rgba(217, 45, 32, 0.12)" zIndex={2} />
            ))}
            <Marker coordinate={mock.shelling.epicenter} zIndex={40} tracksViewChanges={false}>
              <View style={styles.alertMarker}>
                <Ionicons name="warning" size={15} color="#fff" />
                <Text style={styles.alertMarkerText}>SHELLING</Text>
              </View>
            </Marker>
          </>
        )}

        {plannedRoute && plannedRoute.length > 1 ? <RouteLine points={plannedRoute} /> : route === 'evacuation' ? <RouteLine points={[mock.me, mock.evacuation.coordinate]} /> : route === 'basement' ? <RouteLine points={mock.basementRoute} /> : null}

        {emergencySites.map((site) => (
          groupedKeys.has(`site:${site.id}`) ? null :
          <Marker key={site.id} coordinate={site.coordinate} title={site.title} description={site.summary} onPress={() => onSelectSite?.(site.id)} zIndex={30} tracksViewChanges={false}>
            <View style={[styles.emergencySiteMarker, { backgroundColor: siteColors[site.kind] }]}>
              <Ionicons name={siteIcons[site.kind]} size={18} color="#fff" />
              <Text style={styles.mapMarkerLabel}>{siteLabels[site.kind]}</Text>
            </View>
          </Marker>
        ))}
        {nearbyPeople.map((person) => (
          <Marker key={person.id} coordinate={person.coordinate} title={`${person.name} · ${person.distance} away`} zIndex={18}>
            <View style={styles.nearbyPersonMarker}>
              <Text style={styles.nearbyPersonInitials}>{person.initials}</Text>
              <Text style={styles.nearbyPersonLabel}>{person.name}</Text>
            </View>
          </Marker>
        ))}
        {helpOffers.map((offer) => (
          groupedKeys.has(`offer:${offer.id}`) ? null :
          <Marker key={offer.id} coordinate={offer.coordinate} zIndex={35} tracksViewChanges={false} onPress={() => onSelectOffer?.(offer.id)}>
            <View style={styles.offerMarker}>
              <Ionicons name="medkit" size={15} color="#fff" />
              <Text style={styles.offerMarkerLabel}>OFFER</Text>
            </View>
          </Marker>
        ))}
        {placeGroups.map((group) => (
          <Marker key={group.key} coordinate={group.coordinate} zIndex={120} tracksViewChanges={false} onPress={() => setPlaceChoices(group.items)}>
            <View style={styles.placeGroupMarker}><Ionicons name="layers" size={15} color="#fff" /><Text style={styles.placeGroupCount}>{group.items.length}</Text></View>
          </Marker>
        ))}
        {destination && (
          <Marker coordinate={destination} title="Selected destination" description="Long-press a different place to change the destination." zIndex={80}>
            <View style={styles.destinationMarker}><Ionicons name="flag" size={18} color="#fff" /></View>
          </Marker>
        )}

        {showBasement && (
          <Marker coordinate={mock.basement.coordinate} title="Safe basement" description={`${mock.basement.author} · ${mock.basement.street}`} zIndex={22}>
            <View style={styles.basementMarker}><Ionicons name="home" size={18} color="#fff" /></View>
          </Marker>
        )}
        {sos && mock.authorities.map((authority) => (
          <Marker key={authority.id} coordinate={authority.coordinate} title={authority.label} zIndex={25}>
            <View style={[styles.authorityMarker, { backgroundColor: authority.color }]}><Text style={styles.authorityLabel}>{authority.label}</Text></View>
          </Marker>
        ))}
        <Marker coordinate={currentLocation ?? userLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={100} tracksViewChanges={false}>
          <View style={styles.myLocationMarker}>
            <View style={[styles.locationAccuracyRing, sos && styles.locationAccuracyRingSos]} />
            <View style={[styles.meMarker, sos && styles.meMarkerSos]}><Ionicons name={sos ? 'radio' : 'locate'} size={16} color="#fff" /></View>
            <View style={[styles.myLocationLabel, sos && styles.myLocationLabelSos]}><Text style={styles.myLocationLabelText}>{sos ? 'SOS' : 'YOU'}</Text></View>
          </View>
        </Marker>
      </MapView>
      <CurrentLocationButton onLocation={(coordinate) => {
        setCurrentLocation(coordinate);
        map.current?.animateToRegion(regionAround(coordinate), 650);
      }} />
      <MapPlaceChooser visible={placeChoices !== null} items={placeChoices ?? []} onChoose={choosePlace} onClose={() => setPlaceChoices(null)} />
      <View pointerEvents="none" style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap contributors</Text></View>
    </View>
  );
}

function RouteLine({ points }: { points: Coordinate[] }) {
  return <><Polyline coordinates={points} strokeColor="rgba(7, 148, 85, 0.25)" strokeWidth={10} zIndex={3} /><Polyline coordinates={points} strokeColor={colors.green} strokeWidth={4} lineDashPattern={[10, 8]} zIndex={4} /></>;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#EEF1F4' },
  incidentMarker: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  incidentMarkerSelected: { transform: [{ scale: 1.2 }], borderColor: '#101828' },
  alertMarker: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.red, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, ...shadow },
  alertMarkerText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  basementMarker: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff', backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', ...shadow },
  authorityMarker: { borderRadius: 7, borderWidth: 2, borderColor: '#fff', paddingHorizontal: 7, paddingVertical: 4, ...shadow },
  authorityLabel: { color: '#fff', fontSize: 10, fontWeight: '800' },
  myLocationMarker: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  locationAccuracyRing: { position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(21, 112, 239, 0.18)', borderWidth: 2, borderColor: 'rgba(21, 112, 239, 0.42)' },
  locationAccuracyRingSos: { backgroundColor: 'rgba(217, 45, 32, 0.2)', borderColor: 'rgba(217, 45, 32, 0.5)' },
  meMarker: { width: 34, height: 34, borderRadius: 17, borderWidth: 4, borderColor: '#fff', backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', ...shadow },
  meMarkerSos: { backgroundColor: colors.red, transform: [{ scale: 1.1 }] },
  myLocationLabel: { position: 'absolute', top: 48, backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  myLocationLabelSos: { backgroundColor: colors.red },
  myLocationLabelText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  attribution: { position: 'absolute', right: 5, bottom: 5, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  attributionText: { fontSize: 8, color: colors.textMuted },
  dangerMarker: { minWidth: 70, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, ...shadow },
  emergencySiteMarker: { minWidth: 72, height: 36, borderRadius: 10, borderWidth: 3, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, ...shadow },
  nearbyPersonMarker: { height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff', backgroundColor: colors.violet, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, ...shadow },
  nearbyPersonInitials: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', color: colors.violet, fontSize: 10, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center' },
  nearbyPersonLabel: { color: '#fff', fontSize: 10, fontWeight: '800' },
  offerMarker: { minWidth: 64, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#fff', backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, ...shadow },
  offerMarkerLabel: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  placeGroupMarker: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, borderColor: '#fff', backgroundColor: colors.text, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, ...shadow },
  placeGroupCount: { color: '#fff', fontSize: 12, fontWeight: '900' },
  destinationMarker: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: '#fff', backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', ...shadow },
  mapMarkerLabel: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});

const dangerColors = { attack: colors.red, fire: '#F04438', flooding: colors.violet, riot: colors.orange } as const;
const dangerIcons = { attack: 'warning', fire: 'flame', flooding: 'water', riot: 'people' } as const;
const dangerLabels = { attack: 'ATTACK', fire: 'FIRE', flooding: 'FLOOD', riot: 'RIOT' } as const;
const siteColors = { shelter: colors.green, safe_zone: colors.blue, aid: colors.orange } as const;
const siteIcons = { shelter: 'bed', safe_zone: 'shield-checkmark', aid: 'medkit' } as const;
const siteLabels = { shelter: 'SHELTER', safe_zone: 'SAFE ZONE', aid: 'AID' } as const;

function heatColor(color: string, factor: number) {
  const alpha = factor === 1 ? 0.12 : factor === 0.7 ? 0.14 : 0.2;
  return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}
