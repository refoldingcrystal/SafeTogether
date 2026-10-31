import type { Coordinate } from '@/shared/demo';

export type MapPlaceKind = 'incident' | 'danger' | 'site' | 'offer';
export type MapPlaceItem = { key: string; id: string; kind: MapPlaceKind; title: string; coordinate: Coordinate };
export type MapPlaceGroup = { key: string; coordinate: Coordinate; items: MapPlaceItem[] };

const SAME_PLACE_RADIUS_METERS = 40;

function distanceInMeters(a: Coordinate, b: Coordinate) {
  const latitude = ((b.latitude - a.latitude) * Math.PI) / 180;
  const longitude = ((b.longitude - a.longitude) * Math.PI) / 180;
  const latitudeOrigin = (a.latitude * Math.PI) / 180;
  const distance = Math.sin(latitude / 2) ** 2 + Math.cos(latitudeOrigin) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(longitude / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(distance), Math.sqrt(1 - distance));
}

/** Group map pins only when their coordinates are within the same physical place. */
export function groupMapPlaces(items: MapPlaceItem[]): MapPlaceGroup[] {
  const groups: MapPlaceGroup[] = [];
  for (const item of items) {
    const group = groups.find((candidate) => distanceInMeters(candidate.coordinate, item.coordinate) <= SAME_PLACE_RADIUS_METERS);
    if (group) group.items.push(item);
    else groups.push({ key: item.key, coordinate: item.coordinate, items: [item] });
  }
  return groups.filter((group) => group.items.length > 1).map((group) => ({
    ...group,
    key: group.items.map((item) => item.key).sort().join('|'),
  }));
}
