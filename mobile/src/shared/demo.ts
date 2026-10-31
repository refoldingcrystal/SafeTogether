import type { HelpCategory, Incident, IncidentCategory, OfficialNotice } from '@/shared/models';

export type Coordinate = { latitude: number; longitude: number };
export type DangerKind = 'attack' | 'fire' | 'flooding';
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
export type MapHelpOffer = { id: string; title: string; description?: string; author: string; distance: string; coordinate: Coordinate };

export const incidentCategories: IncidentCategory[] = ['Medical emergency', 'Fire', 'Flooding', 'Trapped person', 'Missing person', 'Road blockage', 'Infrastructure damage', 'Other'];
export const helpCategories: HelpCategory[] = ['Shelter', 'Food and water', 'Transport', 'Qualified first aid', 'Supplies', 'Other practical help'];

export const demonstrationIncidents: Incident[] = [
  { id: 'ST-2044', category: 'Fire', description: 'Smoke visible from a building roof; residents leaving the area.', approximateLocation: { label: 'Central district', precision: 'neighborhood', latitude: 52.2335, longitude: 21.0005 }, submittedAt: '4 min ago', updatedAt: '4 min ago', source: 'community', verificationStatus: 'unverified', incidentStatus: 'new' },
  { id: 'ST-2041', category: 'Flooding', description: 'Water collecting at the underpass; passable only with caution.', approximateLocation: { label: 'Riverside district', precision: 'district', latitude: 52.2395, longitude: 21.0305 }, submittedAt: '12 min ago', updatedAt: '12 min ago', source: 'community', verificationStatus: 'verified', incidentStatus: 'verified' },
  { id: 'ST-2038', category: 'Road blockage', description: 'Tree across the eastbound lane near the park entrance.', approximateLocation: { label: 'North park road', precision: 'landmark', latitude: 52.2465, longitude: 21.0045 }, submittedAt: '28 min ago', updatedAt: '28 min ago', source: 'community', verificationStatus: 'awaiting_review', incidentStatus: 'under_review' },
  { id: 'ST-2032', category: 'Infrastructure damage', description: 'Signal lights are not working at the junction.', approximateLocation: { label: 'Central junction', precision: 'landmark', latitude: 52.2275, longitude: 21.0125 }, submittedAt: '54 min ago', updatedAt: '54 min ago', source: 'community', verificationStatus: 'verified', incidentStatus: 'verified' },
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
    title: 'Attack reported',
    summary: 'Reports of shelling. Stay indoors and avoid this area.',
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
  {
    id: 'DZ-03',
    kind: 'flooding',
    title: 'Flooded underpass',
    summary: 'Road is hazardous and may be impassable.',
    coordinate: { latitude: 52.2395, longitude: 21.0305 },
    radius: 450,
    severity: 'medium',
  },
];

export const emergencySites: EmergencySite[] = [
  {
    id: 'shelter-szczesliwice',
    kind: 'shelter',
    title: 'Szczęśliwice shelter',
    summary: 'Official evacuation shelter with water, medical support and transport.',
    coordinate: { latitude: 52.202, longitude: 20.955 },
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

export const demonstrationHelpOffers: MapHelpOffer[] = [
  { id: 'demo-offer-water', title: 'Food and water', description: 'Bottled water available for pickup.', author: 'Demo volunteer', distance: 'Central district', coordinate: { latitude: 52.228, longitude: 20.999 } },
  { id: 'demo-offer-shelter', title: 'Shelter', description: 'A few safe places available nearby.', author: 'Demo volunteer', distance: 'Southern district', coordinate: { latitude: 52.219, longitude: 21.016 } },
];
