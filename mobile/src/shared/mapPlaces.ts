import type { Coordinate } from '@/shared/demo';

export type MapPlaceKind = 'incident' | 'danger' | 'site' | 'offer';
export type MapPlaceItem = { key: string; id: string; kind: MapPlaceKind; title: string; coordinate: Coordinate };
export type MapPlaceGroup = { coordinate: Coordinate; items: MapPlaceItem[] };

/** Group pins at the same displayed area; coordinates are already approximate for shared reports. */
export function groupMapPlaces(items: MapPlaceItem[]): MapPlaceGroup[] {
  const groups = new Map<string, MapPlaceGroup>();
  for (const item of items) {
    const key = `${item.coordinate.latitude.toFixed(2)}:${item.coordinate.longitude.toFixed(2)}`;
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { coordinate: item.coordinate, items: [item] });
  }
  return [...groups.values()].filter((group) => group.items.length > 1);
}
