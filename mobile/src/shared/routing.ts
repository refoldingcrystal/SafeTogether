import type { Coordinate, DangerZone } from '@/shared/demo';

export type SafeRoute = {
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
  avoidedZoneIds: string[];
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
};

type OsrmResponse = { code: string; routes?: OsrmRoute[] };

const METERS_PER_LATITUDE_DEGREE = 111_320;
const SAFETY_BUFFER_METERS = 100;

function pointToSegmentDistanceMeters(point: Coordinate, start: Coordinate, end: Coordinate) {
  const longitudeScale = Math.cos((point.latitude * Math.PI) / 180);
  const px = point.longitude * METERS_PER_LATITUDE_DEGREE * longitudeScale;
  const py = point.latitude * METERS_PER_LATITUDE_DEGREE;
  const ax = start.longitude * METERS_PER_LATITUDE_DEGREE * longitudeScale;
  const ay = start.latitude * METERS_PER_LATITUDE_DEGREE;
  const bx = end.longitude * METERS_PER_LATITUDE_DEGREE * longitudeScale;
  const by = end.latitude * METERS_PER_LATITUDE_DEGREE;
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function routeEntersDangerZone(route: Coordinate[], zone: DangerZone) {
  return route.some((point, index) => {
    const previous = route[Math.max(index - 1, 0)];
    return pointToSegmentDistanceMeters(zone.coordinate, previous, point) < zone.radius + SAFETY_BUFFER_METERS;
  });
}

function detourPoint(zone: DangerZone, from: Coordinate, to: Coordinate, side: 1 | -1): Coordinate {
  const latitudeDelta = to.latitude - from.latitude;
  const longitudeDelta = to.longitude - from.longitude;
  const length = Math.hypot(latitudeDelta, longitudeDelta) || 1;
  const clearance = zone.radius + SAFETY_BUFFER_METERS + 300;
  const latitudeOffset = side * (-longitudeDelta / length) * (clearance / METERS_PER_LATITUDE_DEGREE);
  const longitudeOffset = side * (latitudeDelta / length) * (clearance / (METERS_PER_LATITUDE_DEGREE * Math.cos((zone.coordinate.latitude * Math.PI) / 180)));
  return { latitude: zone.coordinate.latitude + latitudeOffset, longitude: zone.coordinate.longitude + longitudeOffset };
}

function candidateWaypointSets(from: Coordinate, to: Coordinate, zones: DangerZone[]) {
  const directCorridorZones = zones.filter((zone) => pointToSegmentDistanceMeters(zone.coordinate, from, to) < zone.radius + SAFETY_BUFFER_METERS);
  if (directCorridorZones.length === 0) return [[]];
  return [
    [],
    directCorridorZones.map((zone) => detourPoint(zone, from, to, 1)),
    directCorridorZones.map((zone) => detourPoint(zone, from, to, -1)),
  ];
}

async function fetchRoadRoutes(points: Coordinate[], controller: AbortController) {
  const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?alternatives=true&overview=full&geometries=geojson&steps=false`, { signal: controller.signal });
  if (!response.ok) throw new Error('Route service is unavailable');
  const data = (await response.json()) as OsrmResponse;
  return data.code === 'Ok' ? data.routes ?? [] : [];
}

/**
 * Requests candidate routes along roads, then rejects every geometry that enters a
 * danger radius (plus a 100 m buffer). The shortest remaining road route is shown.
 */
export async function requestSafeRoadRoute(from: Coordinate, to: Coordinate, zones: DangerZone[]): Promise<SafeRoute> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const corridorZoneIds = new Set(zones.filter((zone) => pointToSegmentDistanceMeters(zone.coordinate, from, to) < zone.radius + SAFETY_BUFFER_METERS).map((zone) => zone.id));
    const candidateSets = candidateWaypointSets(from, to, zones);
    const routeGroups = await Promise.all(candidateSets.map(async (waypoints) => {
      try {
        return await fetchRoadRoutes([from, ...waypoints, to], controller);
      } catch {
        return [];
      }
    }));
    const safeRoutes = routeGroups.flat().map((route) => ({
      route,
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    })).filter(({ coordinates }) => !zones.some((zone) => routeEntersDangerZone(coordinates, zone)));
    const shortest = safeRoutes.sort((a, b) => a.route.distance - b.route.distance)[0];
    if (!shortest) throw new Error('No verified safe road route found');
    return {
      coordinates: shortest.coordinates,
      distanceKm: shortest.route.distance / 1000,
      durationMinutes: Math.max(1, Math.round(shortest.route.duration / 60)),
      avoidedZoneIds: zones.filter((zone) => corridorZoneIds.has(zone.id)).map((zone) => zone.id),
    };
  } finally {
    clearTimeout(timeout);
  }
}
