import 'leaflet/dist/leaflet.css';
import './map.css';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import mock from '@/data/mock.json';
import { incidentColors } from '@/icons';
import { colors } from '@/theme';
import type { Incident } from '@/shared/models';
import type { TacticalMapProps } from './TacticalMap';

type LatLng = { latitude: number; longitude: number };

const ll = (c: LatLng): [number, number] => [c.latitude, c.longitude];
const icon = (html: string, size: [number, number] = [0, 0]) =>
  L.divIcon({ className: 'm-icon', html, iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });

const HOUSE_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3l10 8h-3v10h-5v-6h-4v6H5V11H2z"/></svg>';

const GLYPHS: Record<string, string> = {
  Fire: '<path d="M12 2s5 4.5 5 10a5 5 0 01-10 0c0-2 1-3.5 1-3.5S9 11 11 11c0-4 1-9 1-9z"/>',
  Flooding: '<path d="M12 3c-4 5-6 8-6 11a6 6 0 0012 0c0-3-2-6-6-11z"/>',
  'Road blockage': '<path d="M5 11l2-5h10l2 5h1v7h-2v2h-3v-2H9v2H6v-2H4v-7zm2.5-1h9l-1-3h-7z"/>',
  'Infrastructure damage': '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
};
const DEFAULT_GLYPH = '<path d="M11 4h2v10h-2zM11 17h2v2h-2z"/>';
const precisionRadius = { district: 450, neighborhood: 320, landmark: 200 } as const;

// Deterministic "people nearby" scattered around the user.
const nearby = Array.from({ length: 16 }, (_, i) => ({
  latitude: mock.me.latitude + Math.sin(i * 2.4) * 0.004 * (0.4 + (i % 4) / 4),
  longitude: mock.me.longitude + Math.cos(i * 2.4) * 0.0065 * (0.4 + (i % 3) / 3),
}));

const evacMid = {
  latitude: (mock.me.latitude + mock.evacuation.coordinate.latitude) / 2,
  longitude: (mock.me.longitude + mock.evacuation.coordinate.longitude) / 2,
};

const START_BOUNDS = L.latLngBounds([ll(mock.evacuation.coordinate), ll(mock.family[2].coordinate)]);

function incidentPoint(incident: Incident): [number, number] | null {
  const { latitude, longitude } = incident.approximateLocation;
  return latitude == null || longitude == null ? null : [latitude, longitude];
}

function Camera({ shelling, sos, route, incidents, selectedId }: TacticalMapProps) {
  const map = useMap();
  const selected = incidents.find((i) => i.id === selectedId);
  const target = selected ? incidentPoint(selected) : null;
  const targetKey = target?.join(',');
  useEffect(() => {
    if (route === 'basement') map.flyToBounds(L.latLngBounds(mock.basementRoute.map(ll)), { padding: [80, 80], duration: 1 });
    else if (route === 'evacuation') map.flyToBounds(START_BOUNDS, { padding: [30, 30], duration: 1 });
    else if (shelling || sos) map.flyTo(ll(mock.me), 15, { duration: 1 });
    else if (targetKey) map.flyTo(targetKey.split(',').map(Number) as [number, number], 15, { duration: 0.8 });
    else map.flyToBounds(START_BOUNDS, { padding: [30, 30], duration: 1 });
  }, [map, shelling, sos, route, targetKey]);
  return null;
}

export function TacticalMap(props: TacticalMapProps) {
  const { shelling, sos, route, showBasement, incidents, selectedId, onSelect } = props;

  return (
    <View style={styles.root}>
      <MapContainer bounds={START_BOUNDS} boundsOptions={{ padding: [30, 30] }} zoomControl={false} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          className="osm-light"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <Camera {...props} />

        {incidents.map((incident) => {
          const pos = incidentPoint(incident);
          if (!pos) return null;
          const color = incidentColors[incident.category] ?? colors.blue;
          const cls = ['m-pin', incident.verificationStatus === 'unverified' ? 'unverified' : '', incident.id === selectedId ? 'selected' : ''].join(' ');
          return (
            <span key={incident.id}>
              <Circle
                center={pos}
                radius={precisionRadius[incident.approximateLocation.precision]}
                pathOptions={{ color, weight: 1.5, dashArray: '5 5', fillColor: color, fillOpacity: 0.12 }}
                eventHandlers={{ click: () => onSelect(incident.id) }}
              />
              <Marker
                position={pos}
                icon={icon(`<div class="${cls}" style="--c:${color}"><svg viewBox="0 0 24 24">${GLYPHS[incident.category] ?? DEFAULT_GLYPH}</svg></div>`, [34, 34])}
                eventHandlers={{ click: () => onSelect(incident.id) }}
              />
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

        {route === null && (
          <>
            <Polyline
              positions={[ll(mock.me), ll(mock.evacuation.coordinate)]}
              pathOptions={{ color: colors.green, weight: 2, dashArray: '4 6', opacity: 0.8 }}
            />
            <Marker position={ll(evacMid)} icon={icon('<div class="m-distance">5.0 km</div>')} interactive={false} />
          </>
        )}

        {route === 'evacuation' && <RouteLine points={[mock.me, mock.evacuation.coordinate]} />}
        {route === 'basement' && <RouteLine points={mock.basementRoute} />}

        <Marker
          position={ll(mock.evacuation.coordinate)}
          icon={icon('<div class="m-evac">+<div class="m-label">Evacuation point</div></div>', [38, 38])}
        />

        {mock.family.map((f) => (
          <Marker
            key={f.id}
            position={ll(f.coordinate)}
            icon={icon(
              `<div class="m-person" style="--c:${f.color}">${f.initials}<div class="m-label">${f.name} <small>· ${f.status}</small></div></div>`,
              [36, 36],
            )}
          />
        ))}

        {sos &&
          nearby.map((p, i) => (
            <Marker key={i} position={ll(p)} icon={icon('<div class="m-dot"></div>', [10, 10])} interactive={false} />
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
          position={ll(mock.me)}
          zIndexOffset={1000}
          icon={icon(
            `<div class="m-me ${sos ? 'sos' : ''}" style="--c:${sos ? colors.red : colors.blue}"><div class="m-label">${sos ? 'You · SOS' : 'You · 🔒 private'}</div></div>`,
            [22, 22],
          )}
        />
      </MapContainer>
    </View>
  );
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
