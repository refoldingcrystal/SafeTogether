import type { HelpCategory, Incident, OfficialNotice, PersonalHelpCategory } from '@/shared/models';

export type Coordinate = { latitude: number; longitude: number };
export type DangerKind = 'attack' | 'fire' | 'flooding' | 'riot';
export type DangerZone = {
  id: string;
  kind: DangerKind;
  title: string;
  summary: string;
  coordinate: Coordinate;
  radius: number;
  severity: 'critical' | 'high' | 'medium';
};
export type EmergencySite = {
  id: string;
  kind: 'shelter' | 'safe_zone' | 'aid';
  title: string;
  summary: string;
  coordinate: Coordinate;
  capacity?: string;
};
export type NearbyPerson = {
  id: string;
  name: string;
  initials: string;
  distance: string;
  coordinate: Coordinate;
};
export type MapHelpOffer = { id: string; title: string; description?: string; author: string; distance: string; coordinate: Coordinate };

export const incidentCategories: PersonalHelpCategory[] = ['Injured', 'Stranded', 'Lost', 'Other personal assistance'];
export const helpCategories: HelpCategory[] = ['Shelter', 'Food and water', 'Transport', 'Qualified first aid', 'Supplies', 'Other practical help'];

export const demonstrationIncidents: Incident[] = [
  { id: 'ST-2044', reporterName: 'Amina', category: 'Injured', description: 'Needs first aid after a fall.', approximateLocation: { label: 'Central district', precision: 'neighborhood', latitude: 52.2335, longitude: 21.0005 }, submittedAt: '4 min ago', updatedAt: '4 min ago', source: 'community', verificationStatus: 'unverified' },
  { id: 'ST-2041', reporterName: 'Noah', category: 'Stranded', description: 'Needs safe transport to a nearby shelter.', approximateLocation: { label: 'Riverside district', precision: 'district', latitude: 52.2395, longitude: 21.0305 }, submittedAt: '12 min ago', updatedAt: '12 min ago', source: 'community', verificationStatus: 'verified' },
  { id: 'ST-2038', reporterName: 'Leah', category: 'Lost', description: 'Separated from family and needs help reconnecting.', approximateLocation: { label: 'North park area', precision: 'landmark', latitude: 52.2465, longitude: 21.0045 }, submittedAt: '28 min ago', updatedAt: '28 min ago', source: 'community', verificationStatus: 'unverified' },
];

export const demonstrationNotice: OfficialNotice = {
  id: 'N-01',
  title: 'Stay clear of the Riverside underpass',
  body: 'Example notice for demonstration purposes. Always follow directions from local authorities.',
  status: 'published',
  publishedAt: 'Today, 22:10',
};

/** Visible map layers are deliberately limited to information useful during an emergency. */
export const demonstrationDangerZones: DangerZone[] = [
  {
    id: 'DZ-01',
    kind: 'attack',
    title: 'Military attack reported (demo)',
    summary: 'Demonstration alert: take cover indoors and avoid the area.',
    coordinate: { latitude: 52.2312, longitude: 21.0185 },
    radius: 700,
    severity: 'critical',
  },
  {
    id: 'DZ-02',
    kind: 'fire',
    title: 'Building fire',
    summary: 'Smoke and emergency vehicles reported. Keep clear for responders.',
    coordinate: { latitude: 52.2335, longitude: 21.0005 },
    radius: 320,
    severity: 'high',
  },
];

export const emergencySites: EmergencySite[] = [
  {
    id: 'shelter-szczesliwice',
    kind: 'shelter',
    title: 'Emergency shelter',
    summary: 'Water and basic first aid.',
    coordinate: { latitude: 52.222, longitude: 20.984 },
    capacity: '1,200 places',
  },
  {
    id: 'safe-zone-wola',
    kind: 'safe_zone',
    title: 'Wola safe zone',
    summary: 'Assembly point outside the active danger areas.',
    coordinate: { latitude: 52.227, longitude: 20.978 },
    capacity: 'Open assembly area',
  },
  {
    id: 'aid-mokotow',
    kind: 'aid',
    title: 'First-aid point',
    summary: 'Triage and basic first aid. Follow responder instructions.',
    coordinate: { latitude: 52.217, longitude: 21.003 },
  },
];

/** Nearby contacts are intentionally limited to three, so the emergency map stays readable. */
export const nearbyPeople: NearbyPerson[] = [
  { id: 'nearby-maya', name: 'Maya', initials: 'M', distance: '1.0 km', coordinate: { latitude: 52.2325, longitude: 21.008 } },
  { id: 'nearby-alex', name: 'Alex', initials: 'A', distance: '1.2 km', coordinate: { latitude: 52.215, longitude: 20.986 } },
  { id: 'nearby-lee', name: 'Lee', initials: 'L', distance: '1.1 km', coordinate: { latitude: 52.231, longitude: 20.9815 } },
];

export const demonstrationHelpOffers: MapHelpOffer[] = [
  { id: 'demo-offer-water', title: 'Food and water', description: 'Bottled water available for pickup.', author: 'Demo volunteer', distance: 'Central district', coordinate: { latitude: 52.228, longitude: 20.999 } },
  { id: 'demo-offer-shelter', title: 'Shelter', description: 'A few safe places available nearby.', author: 'Demo volunteer', distance: 'Southern district', coordinate: { latitude: 52.219, longitude: 21.016 } },
];
