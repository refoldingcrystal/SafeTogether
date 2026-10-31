import type { HelpCategory, Incident, IncidentCategory, OfficialNotice } from '@/shared/models';

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
