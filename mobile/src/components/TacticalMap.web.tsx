import 'leaflet/dist/leaflet.css';
import './map.css';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { MapPlaceChooser } from '@/components/MapPlaceChooser';
import mock from '@/data/mock.json';
import { colors } from '@/theme';
import type { Incident } from '@/shared/models';
import type { DangerZone, EmergencySite } from '@/shared/demo';
import type { TacticalMapProps } from './TacticalMap';
import { groupMapPlaces, type MapPlaceItem } from '@/shared/mapPlaces';

type LatLng = { latitude: number; longitude: number };

const ll = (c: LatLng): [number, number] => [c.latitude, c.longitude];
const icon = (html: string, size: [number, number] = [0, 0]) =>
  L.divIcon({ className: 'm-icon', html, iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });

const HOUSE_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3l10 8h-3v10h-5v-6h-4v6H5V11H2z"/></svg>';

const precisionRadius = { district: 450, neighborhood: 320, landmark: 200 } as const;
const tileUrl = process.env.EXPO_PUBLIC_MAP_TILE_URL?.trim() || '';
const tileAttribution = process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() || '';

const START_BOUNDS = L.latLngBounds([ll(mock.evacuation.coordinate), ll(mock.family[2].coordinate)]);

function incidentPoint(incident: Incident): [number, number] | null {
  const { latitude, longitude } = incident.approximateLocation;
  return latitude == null || longitude == null ? null : [latitude, longitude];
}

function Camera({ shelling, sos, route, incidents, selectedId, userLocation = mock.me }: TacticalMapProps) {
  const map = useMap();
  const selected = incidents.find((i) => i.id === selectedId);
  const target = selected ? incidentPoint(selected) : null;
  const targetKey = target?.join(',');
  useEffect(() => {
    if (route === 'basement') map.flyToBounds(L.latLngBounds(mock.basementRoute.map(ll)), { padding: [80, 80], duration: 1 });
    else if (route === 'evacuation') map.flyToBounds(START_BOUNDS, { padding: [30, 30], duration: 1 });
    else if (shelling || sos || userLocation.latitude !== mock.me.latitude || userLocation.longitude !== mock.me.longitude) map.flyTo(ll(userLocation), 15, { duration: 1 });
    else if (targetKey) map.flyTo(targetKey.split(',').map(Number) as [number, number], 15, { duration: 0.8 });
    else map.flyToBounds(START_BOUNDS, { padding: [30, 30], duration: 1 });
  }, [map, shelling, sos, route, targetKey, userLocation]);
  return null;
}

export function TacticalMap(props: TacticalMapProps) {
  const [tileUnavailable, setTileUnavailable] = useState(false);
  const [placeChoices, setPlaceChoices] = useState<MapPlaceItem[] | null>(null);
  const { shelling, sos, route, showBasement, showCommunityReports = true, incidents, selectedId, onSelect, dangerZones = [], emergencySites = [], nearbyPeople = [], helpOffers = [], plannedRoute, userLocation = mock.me, onSelectDanger, onSelectSite, onSelectOffer } = props;
  const pulsingIds = new Set(props.pulseIds ?? []);
  const placeGroups = groupMapPlaces([
    ...incidents.flatMap((incident) => {
      const coordinate = incidentPoint(incident);
      return coordinate ? [{ key: `incident:${incident.id}`, kind: 'incident' as const, id: incident.id, title: incident.category, coordinate: { latitude: coordinate[0], longitude: coordinate[1] } }] : [];
    }),
    ...dangerZones.map((zone) => ({ key: `danger:${zone.id}`, kind: 'danger' as const, id: zone.id, title: zone.title, coordinate: zone.coordinate })),
    ...emergencySites.map((site) => ({ key: `site:${site.id}`, kind: 'site' as const, id: site.id, title: site.title, coordinate: site.coordinate })),
    ...helpOffers.map((offer) => ({ key: `offer:${offer.id}`, kind: 'offer' as const, id: offer.id, title: offer.title, coordinate: offer.coordinate })),
    ...((props.helpRequests ?? []).map((request) => ({ key: `request:${request.id}`, kind: 'request' as const, id: request.id, title: request.title, coordinate: request.coordinate }))),
  ]);
  const groupedKeys = new Set(placeGroups.flatMap((group) => group.items.map((item) => item.key)));

  function choosePlace(item: MapPlaceItem) {
    setPlaceChoices(null);
    if (item.kind === 'incident') onSelect(item.id);
    else if (item.kind === 'danger') onSelectDanger?.(item.id);
    else if (item.kind === 'site') onSelectSite?.(item.id);
    else if (item.kind === 'request') props.onSelectHelpRequest?.(item.id);
    else onSelectOffer?.(item.id);
  }

  return (
    <View style={styles.root}>
      <MapContainer bounds={START_BOUNDS} boundsOptions={{ padding: [30, 30] }} zoomControl={false} style={{ width: '100%', height: '100%' }}>
        {tileUrl && !tileUnavailable && (
          <TileLayer
            className="osm-light"
            url={tileUrl}
            attribution={tileAttribution}
            maxZoom={14}
            updateWhenIdle
            updateWhenZooming={false}
            keepBuffer={1}
            eventHandlers={{ tileerror: () => setTileUnavailable(true) }}
          />
        )}
        <Camera {...props} />

        {showCommunityReports && incidents.map((incident) => {
          const pos = incidentPoint(incident);
          if (!pos) return null;
          const color = colors.red;
          const cls = ['m-help-map-marker', 'm-help-map-marker-incident', incident.id === selectedId ? 'selected' : '', pulsingIds.has(`incident:${incident.id}`) ? 'm-pulse' : ''].join(' ');
          return (
            <span key={incident.id}>
              <Circle
                center={pos}
                radius={precisionRadius[incident.approximateLocation.precision]}
                pathOptions={{ color, weight: 1.5, dashArray: '5 5', fillColor: color, fillOpacity: 0.12 }}
                eventHandlers={{ click: () => onSelect(incident.id) }}
              />
              {!groupedKeys.has(`incident:${incident.id}`) && <Marker
                position={pos}
                zIndexOffset={5000}
                icon={icon(`<div class="${cls}"><svg class="m-help-map-marker-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v6m0 4h.01" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>HELP</div>`, [64, 34])}
                eventHandlers={{ click: () => onSelect(incident.id) }}
              />}
            </span>
          );
        })}

        {dangerZones.map((zone) => {
          const color = dangerColor(zone);
          return (
            <span key={zone.id}>
              {[1, 0.7, 0.42].map((factor) => (
                <Circle key={factor} center={ll(zone.coordinate)} radius={zone.radius * factor} pathOptions={{ color: factor === 1 ? color : 'transparent', weight: factor === 1 ? 2 : 0, fillColor: color, fillOpacity: factor === 1 ? 0.1 : factor === 0.7 ? 0.13 : 0.2 }} />
              ))}
              {!groupedKeys.has(`danger:${zone.id}`) && <Marker position={ll(zone.coordinate)} icon={icon(`<div class="m-danger${pulsingIds.has(`danger:${zone.id}`) ? ' m-pulse' : ''}" style="--c:${color}">${dangerSymbol(zone)}<div class="m-label">${dangerLabel(zone)}</div></div>`, [38, 38])} eventHandlers={{ click: () => onSelectDanger?.(zone.id) }} />}
            </span>
          );
        })}

        {shelling && (
          <>
            {[1, 0.78, 0.58, 0.4, 0.24].map((t) => (
              <Circle
                key={t}
                center={ll(mock.shelling.epicenter)}
                radius={mock.shelling.radius * t}
                pathOptions={{ stroke: false, fillColor: colors.red, fillOpacity: 0.16, interactive: false }}
              />
            ))}
            <Circle
              center={ll(mock.shelling.epicenter)}
              radius={mock.shelling.radius}
              pathOptions={{ color: colors.red, weight: 2, dashArray: '6 6', fill: false, interactive: false }}
            />
            <Marker position={ll(mock.shelling.epicenter)} icon={icon('<div class="m-alert">⚠ SHELLING</div>')} interactive={false} />
          </>
        )}

        {plannedRoute && plannedRoute.length > 1 ? <RouteLine points={plannedRoute} /> : route === 'evacuation' ? <RouteLine points={[mock.me, mock.evacuation.coordinate]} /> : route === 'basement' ? <RouteLine points={mock.basementRoute} /> : null}

        {emergencySites.map((site) => (
          groupedKeys.has(`site:${site.id}`) ? null :
          <Marker key={site.id} position={ll(site.coordinate)} icon={icon(`<div class="m-site${pulsingIds.has(`site:${site.id}`) ? ' m-pulse' : ''}" style="--c:${siteColor(site)}">${siteSymbol(site)}<div class="m-label">${site.title}</div></div>`, [38, 38])} eventHandlers={{ click: () => onSelectSite?.(site.id) }} />
        ))}
        {helpOffers.map((offer) => (
          groupedKeys.has(`offer:${offer.id}`) ? null :
          <Marker key={offer.id} position={ll(offer.coordinate)} icon={icon(`<div class="m-offer${pulsingIds.has(`offer:${offer.id}`) ? ' m-pulse' : ''}">＋<div class="m-label">HELP OFFER</div></div>`, [38, 38])} eventHandlers={{ click: () => onSelectOffer?.(offer.id) }} />
        ))}
        {(props.helpRequests ?? []).map((request) => (
          groupedKeys.has(`request:${request.id}`) ? null :
          <Marker key={request.id} position={ll(request.coordinate)} icon={icon(`<div class="m-help-map-marker m-help-map-marker-request${pulsingIds.has(`request:${request.id}`) ? ' m-pulse' : ''}"><svg class="m-help-map-marker-icon" viewBox="0 0 24 24"><path d="M7 12V6a1.5 1.5 0 0 1 3 0v5V4a1.5 1.5 0 0 1 3 0v7V5a1.5 1.5 0 0 1 3 0v7l1-1a1.5 1.5 0 0 1 2.1 2.1l-3.2 3.2A5.5 5.5 0 0 1 13 18h-1.5a4 4 0 0 1-2.8-1.2L5 13.1a1.5 1.5 0 0 1 2.1-2.1L9 12" fill="currentColor"/></svg>NEED</div>`, [64, 34])} eventHandlers={{ click: () => props.onSelectHelpRequest?.(request.id) }} />
        ))}
        {placeGroups.map((group) => (
          <Marker key={group.key} position={ll(group.coordinate)} zIndexOffset={2000} icon={icon(`<div class="m-cluster${group.items.some((item) => pulsingIds.has(item.key)) ? ' m-pulse' : ''}">${group.items.length}</div>`, [42, 42])} eventHandlers={{ click: () => setPlaceChoices(group.items) }} />
        ))}

        {nearbyPeople.map((person) => (
          <Marker key={person.id} position={ll(person.coordinate)} icon={icon(`<div class="m-person-nearby">${person.initials}<div class="m-label">${person.name} · ${person.distance}</div></div>`, [32, 32])} />
        ))}

        {sos &&
          mock.authorities.map((a) => (
            <Marker key={a.id} position={ll(a.coordinate)} icon={icon(`<div class="m-auth" style="--c:${a.color}">${a.label}</div>`)} />
          ))}

        {showBasement && (
          <Marker
            position={ll(mock.basement.coordinate)}
            icon={icon(`<div class="m-house">${HOUSE_SVG}<div class="m-label">Safe basement <small>· ${mock.basement.author}</small></div></div>`, [36, 36])}
          />
        )}

        <Marker
          position={ll(userLocation)}
          zIndexOffset={1000}
          icon={icon(
            `<div class="m-me ${sos ? 'sos' : ''}" style="--c:${sos ? colors.red : colors.blue}">⌖<div class="m-label">${sos ? 'SOS · your location' : 'YOU · your location'}</div></div>`,
            [34, 34],
          )}
        />
      </MapContainer>
      <MapPlaceChooser visible={placeChoices !== null} items={placeChoices ?? []} onChoose={choosePlace} onClose={() => setPlaceChoices(null)} />
    </View>
  );
}

function dangerColor(zone: DangerZone) {
  return zone.kind === 'flooding' ? colors.violet : zone.kind === 'fire' ? '#F04438' : zone.kind === 'riot' ? colors.orange : colors.red;
}

function dangerSymbol(zone: DangerZone) {
  return zone.kind === 'fire' ? '♨' : zone.kind === 'flooding' ? '≈' : zone.kind === 'riot' ? '!' : '⚠';
}

function dangerLabel(zone: DangerZone) {
  return zone.kind === 'fire' ? 'FIRE' : zone.kind === 'riot' ? 'RIOT' : zone.kind === 'attack' ? 'ATTACK' : 'FLOOD';
}

function siteColor(site: EmergencySite) {
  return site.kind === 'shelter' ? colors.green : site.kind === 'aid' ? colors.orange : colors.blue;
}

function siteSymbol(site: EmergencySite) {
  return site.kind === 'shelter' ? '⌂' : site.kind === 'aid' ? '+' : '✓';
}

function RouteLine({ points }: { points: LatLng[] }) {
  const pos = points.map(ll);
  return (
    <>
      <Polyline positions={pos} pathOptions={{ color: colors.green, weight: 10, opacity: 0.25 }} />
      <Polyline positions={pos} pathOptions={{ color: colors.green, weight: 5, className: 'm-route' }} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 0 },
});
