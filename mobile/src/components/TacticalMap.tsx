import { Fragment, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker, Polyline, UrlTile } from 'react-native-maps';
import mock from '@/data/mock.json';
import { categoryIcons, incidentColors } from '@/icons';
import type { Incident } from '@/shared/models';
import type { Coordinate, DangerZone, EmergencySite } from '@/shared/demo';
import type { Route } from '@/state/app';
import { colors, shadow } from '@/theme';

export type TacticalMapProps = {
  shelling: boolean;
  sos: boolean;
  route: Route;
  showBasement: boolean;
  offline?: boolean;
  dangerZones?: DangerZone[];
  emergencySites?: EmergencySite[];
  plannedRoute?: Coordinate[];
  destination?: Coordinate;
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectDanger?: (id: string) => void;
  onSelectSite?: (id: string) => void;
  onDestinationLongPress?: (coordinate: Coordinate) => void;
};

const MAP_REGION = { latitude: 52.225, longitude: 20.995, latitudeDelta: 0.065, longitudeDelta: 0.11 };
const precisionRadius = { district: 450, neighborhood: 320, landmark: 200 } as const;
const nearby = Array.from({ length: 16 }, (_, i) => ({
  latitude: mock.me.latitude + Math.sin(i * 2.4) * 0.004 * (0.4 + (i % 4) / 4),
  longitude: mock.me.longitude + Math.cos(i * 2.4) * 0.0065 * (0.4 + (i % 3) / 3),
}));

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
  offline = false,
  dangerZones = [],
  emergencySites = [],
  plannedRoute,
  destination,
  incidents,
  selectedId,
  onSelect,
  onSelectDanger,
  onSelectSite,
  onDestinationLongPress,
}: TacticalMapProps) {
  const map = useRef<MapView>(null);
  const selected = useMemo(() => incidents.find((incident) => incident.id === selectedId), [incidents, selectedId]);

  useEffect(() => {
    const selectedPoint = selected ? incidentPoint(selected) : null;
    if (route === 'basement') {
      map.current?.fitToCoordinates(mock.basementRoute, { edgePadding: { top: 130, right: 48, bottom: 300, left: 48 }, animated: true });
    } else if (route === 'evacuation') {
      map.current?.fitToCoordinates([mock.me, mock.evacuation.coordinate], { edgePadding: { top: 130, right: 48, bottom: 300, left: 48 }, animated: true });
    } else if (shelling || sos) {
      map.current?.animateToRegion(regionAround(mock.me, 0.026), 650);
    } else if (selectedPoint) {
      map.current?.animateToRegion(regionAround(selectedPoint), 550);
    }
  }, [route, selected, shelling, sos]);

  return (
    <View style={styles.root} accessibilityLabel="Demonstration map powered by OpenStreetMap">
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={MAP_REGION}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        onLongPress={(event) => onDestinationLongPress?.(event.nativeEvent.coordinate)}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          shouldReplaceMapContent={Platform.OS === 'ios'}
          offlineMode={offline}
          zIndex={0}
        />

        {incidents.map((incident) => {
          const coordinate = incidentPoint(incident);
          if (!coordinate) return null;
          const color = incidentColors[incident.category] ?? colors.blue;
          const isSelected = incident.id === selectedId;
          return (
            <Fragment key={incident.id}>
              <Circle center={coordinate} radius={precisionRadius[incident.approximateLocation.precision]} strokeColor={color} strokeWidth={isSelected ? 2.5 : 1.25} fillColor={`${color}20`} zIndex={1} />
              <Marker coordinate={coordinate} onPress={() => onSelect(incident.id)} zIndex={isSelected ? 50 : 10}>
                <View style={[styles.incidentMarker, { backgroundColor: color }, isSelected && styles.incidentMarkerSelected]}>
                  <Ionicons name={categoryIcons[incident.category] ?? 'alert'} size={16} color="#fff" />
                </View>
              </Marker>
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
              <Marker coordinate={zone.coordinate} title={zone.title} description={zone.summary} onPress={() => onSelectDanger?.(zone.id)} zIndex={45}>
                <View style={[styles.dangerMarker, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={17} color="#fff" />
                  <Text style={styles.mapMarkerLabel}>{dangerLabels[zone.kind]}</Text>
                </View>
              </Marker>
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
          <Marker key={site.id} coordinate={site.coordinate} title={site.title} description={site.summary} onPress={() => onSelectSite?.(site.id)} zIndex={30}>
            <View style={[styles.emergencySiteMarker, { backgroundColor: siteColors[site.kind] }]}>
              <Ionicons name={siteIcons[site.kind]} size={18} color="#fff" />
              <Text style={styles.mapMarkerLabel}>{siteLabels[site.kind]}</Text>
            </View>
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
        {sos && nearby.map((coordinate, index) => (
          <Marker key={index} coordinate={coordinate} tracksViewChanges={false} tappable={false} zIndex={4}><View style={styles.nearbyDot} /></Marker>
        ))}
        {sos && mock.authorities.map((authority) => (
          <Marker key={authority.id} coordinate={authority.coordinate} title={authority.label} zIndex={25}>
            <View style={[styles.authorityMarker, { backgroundColor: authority.color }]}><Text style={styles.authorityLabel}>{authority.label}</Text></View>
          </Marker>
        ))}
        <Marker coordinate={mock.me} zIndex={100} tracksViewChanges={false}>
          <View style={[styles.meMarker, sos && styles.meMarkerSos]}><Ionicons name={sos ? 'radio' : 'person'} size={12} color="#fff" /></View>
        </Marker>
      </MapView>
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
  nearbyDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff', backgroundColor: colors.textMuted },
  authorityMarker: { borderRadius: 7, borderWidth: 2, borderColor: '#fff', paddingHorizontal: 7, paddingVertical: 4, ...shadow },
  authorityLabel: { color: '#fff', fontSize: 10, fontWeight: '800' },
  meMarker: { width: 26, height: 26, borderRadius: 13, borderWidth: 4, borderColor: '#fff', backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', ...shadow },
  meMarkerSos: { backgroundColor: colors.red, transform: [{ scale: 1.15 }] },
  attribution: { position: 'absolute', right: 5, bottom: 5, backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  attributionText: { fontSize: 8, color: colors.textMuted },
  dangerMarker: { minWidth: 70, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, ...shadow },
  emergencySiteMarker: { minWidth: 72, height: 36, borderRadius: 10, borderWidth: 3, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, ...shadow },
  destinationMarker: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: '#fff', backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', ...shadow },
  mapMarkerLabel: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});

const dangerColors = { attack: colors.red, fire: '#F04438', flooding: colors.violet } as const;
const dangerIcons = { attack: 'warning', fire: 'flame', flooding: 'water' } as const;
const dangerLabels = { attack: 'ATTACK', fire: 'FIRE', flooding: 'FLOOD' } as const;
const siteColors = { shelter: colors.green, safe_zone: colors.blue, aid: colors.orange } as const;
const siteIcons = { shelter: 'bed', safe_zone: 'shield-checkmark', aid: 'medkit' } as const;
const siteLabels = { shelter: 'SHELTER', safe_zone: 'SAFE ZONE', aid: 'AID' } as const;

function heatColor(color: string, factor: number) {
  const alpha = factor === 1 ? 0.12 : factor === 0.7 ? 0.14 : 0.2;
  return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}
