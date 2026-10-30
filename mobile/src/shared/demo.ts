import type { HelpCategory, Incident, IncidentCategory, OfficialNotice } from '@/shared/models';

export const incidentCategories: IncidentCategory[] = ['Medical emergency', 'Fire', 'Flooding', 'Trapped person', 'Missing person', 'Road blockage', 'Infrastructure damage', 'Other'];
export const helpCategories: HelpCategory[] = ['Shelter', 'Food and water', 'Transport', 'Qualified first aid', 'Supplies', 'Other practical help'];

export const demonstrationIncidents: Incident[] = [
  { id: 'ST-2041', category: 'Flooding', description: 'Water collecting at the underpass; passable only with caution.', approximateLocation: { label: 'Riverside district', precision: 'district' }, submittedAt: '12 min ago', updatedAt: '12 min ago', source: 'community', verificationStatus: 'verified', incidentStatus: 'verified' },
  { id: 'ST-2038', category: 'Road blockage', description: 'Tree across the eastbound lane near the park entrance.', approximateLocation: { label: 'North park road', precision: 'landmark' }, submittedAt: '28 min ago', updatedAt: '28 min ago', source: 'community', verificationStatus: 'awaiting_review', incidentStatus: 'under_review' },
  { id: 'ST-2032', category: 'Infrastructure damage', description: 'Signal lights are not working at the junction.', approximateLocation: { label: 'Central junction', precision: 'landmark' }, submittedAt: '54 min ago', updatedAt: '54 min ago', source: 'community', verificationStatus: 'verified', incidentStatus: 'verified' },
];

export const demonstrationNotice: OfficialNotice = {
  id: 'N-01',
  title: 'Stay clear of the Riverside underpass',
  body: 'Example notice for demonstration purposes. Always follow directions from local authorities.',
  status: 'published',
  publishedAt: 'Today, 10:40',
};
