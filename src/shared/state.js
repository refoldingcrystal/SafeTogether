import { initialReports } from './data.js';

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const state = {
  reports: readStorage('st-reports', initialReports),
  offers: readStorage('st-offers', []),
  notices: readStorage('st-notices', [{ id: 'N-01', title: 'Stay clear of the Riverside underpass', body: 'Example notice for demonstration purposes. Always follow directions from local authorities.', status: 'Published', time: 'Today, 10:40' }]),
  route: location.hash.slice(1) || 'map',
  mapFilter: 'All',
  search: '',
  guideCategory: 'All',
  selectedGuide: null,
  editNotice: null,
  check: readStorage('st-check', {}),
  dashboardTab: 'Overview'
};

export function persist() {
  try {
    localStorage.setItem('st-reports', JSON.stringify(state.reports));
    localStorage.setItem('st-offers', JSON.stringify(state.offers));
    localStorage.setItem('st-notices', JSON.stringify(state.notices));
    localStorage.setItem('st-check', JSON.stringify(state.check));
  } catch {
    // The app remains usable if browser storage is unavailable.
  }
}
