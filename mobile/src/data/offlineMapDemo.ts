import mock from '@/data/mock.json';
import type { Coordinate, EmergencySite } from '@/shared/demo';
import type { SafeRoute } from '@/shared/routing';

export type OfflineDemoPlace = EmergencySite & {
  searchText: string;
  route: SafeRoute;
};

const me = mock.me;

export const offlineDemoPlaces: OfflineDemoPlace[] = [
  {
    id: 'shelter-szczesliwice',
    kind: 'shelter',
    title: 'Szczęśliwice shelter',
    summary: 'Shelter with water, medical support and transport.',
    coordinate: mock.evacuation.coordinate,
    capacity: '1,200 places',
    searchText: 'shelter evacuation water doctor transport szczesliwice',
    route: {
      coordinates: [me, { latitude: 52.2208, longitude: 20.991 }, { latitude: 52.214, longitude: 20.979 }, { latitude: 52.208, longitude: 20.966 }, mock.evacuation.coordinate],
      distanceKm: 5,
      durationMinutes: 65,
      avoidedZoneIds: ['DZ-01'],
      navigationSteps: ['Head south-west toward Grójecka Street.', 'Continue toward Szczęśliwice Park.', 'Follow the marked road to the shelter.'],
    },
  },
  {
    id: 'safe-basement',
    kind: 'shelter',
    title: 'Safe basement · 12 Wilcza St.',
    summary: 'Safe basement with water and room for six people.',
    coordinate: mock.basement.coordinate,
    capacity: 'Room for 6',
    searchText: 'basement shelter wilcza anna water',
    route: {
      coordinates: mock.basementRoute as Coordinate[],
      distanceKm: 0.55,
      durationMinutes: 7,
      avoidedZoneIds: [],
      navigationSteps: ['Head north-east toward Wilcza Street.', 'Continue along the route for about 400 m.', 'The basement entrance is at 12 Wilcza Street.'],
    },
  },
  {
    id: 'safe-zone-wola',
    kind: 'safe_zone',
    title: 'Wola safe zone',
    summary: 'Assembly point outside the danger area.',
    coordinate: { latitude: 52.227, longitude: 20.978 },
    capacity: 'Open assembly area',
    searchText: 'safe zone assembly wola',
    route: {
      coordinates: [me, { latitude: 52.225, longitude: 20.991 }, { latitude: 52.226, longitude: 20.984 }, { latitude: 52.227, longitude: 20.978 }],
      distanceKm: 1.4,
      durationMinutes: 18,
      avoidedZoneIds: ['DZ-01'],
      navigationSteps: ['Head west toward Grzybowska Street.', 'Continue toward the Wola district.', 'Arrive at the Wola safe zone.'],
    },
  },
  {
    id: 'aid-mokotow',
    kind: 'aid',
    title: 'Mokotów first-aid point',
    summary: 'Point for triage and basic first aid.',
    coordinate: { latitude: 52.217, longitude: 21.003 },
    searchText: 'first aid medical doctor mokotow',
    route: {
      coordinates: [me, { latitude: 52.222, longitude: 20.999 }, { latitude: 52.219, longitude: 21.001 }, { latitude: 52.217, longitude: 21.003 }],
      distanceKm: 0.9,
      durationMinutes: 12,
      avoidedZoneIds: [],
      navigationSteps: ['Head south toward the Mokotów district.', 'Continue past the junction.', 'Arrive at the first-aid point.'],
    },
  },
];

export const offlineDemoRoads = offlineDemoPlaces.map((place) => place.route.coordinates);
