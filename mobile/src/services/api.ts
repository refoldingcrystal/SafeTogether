import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ApproximateLocation, IncidentCategory, IncidentStatus, OfficialNotice, VerificationStatus } from '@/shared/models';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
const TOKEN_KEY = 'safetogether.api.token';

let accessToken: string | null = null;
let tokenLoaded = false;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiUser = { id: string; name: string; role: 'resident' | 'authority'; createdAt: string };
export type AuthSession = { token: string; user: ApiUser };
export type HelpKind = 'resource' | 'emergency' | 'event' | 'Request resources' | 'Emergency' | 'Report an event';
export type ApiIncident = {
  id: string;
  category: IncidentCategory;
  description: string;
  approximateLocation: ApproximateLocation;
  submittedAt: string;
  updatedAt: string;
  source: 'community' | 'authority';
  verificationStatus: VerificationStatus;
  status: IncidentStatus;
  attachments: { id: string; mimeType: string; url: string }[];
};

export type HelpFeedItem = {
  id: string;
  type: 'offer' | 'request';
  kind?: string;
  icon: string;
  title: string;
  author: string;
  distance: string;
  tags: string[];
  description?: string;
  photos?: string[];
  isMine?: boolean;
  status: string;
  createdAt: string;
};

export type HelpRequest = HelpFeedItem & { type: 'request'; kind: 'resource' | 'emergency' | 'event' };
export type HelpOffer = HelpFeedItem & { type: 'offer'; categories: string[] };
export type HelpMessage = {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  sentAt: string;
  isMine: boolean;
};

export type CreateOfferInput = {
  categories: string[];
  description?: string;
  approximateLocation?: ApproximateLocation | string | null;
};

export type UpdateOfferInput = Partial<CreateOfferInput> & { status?: 'active' | 'withdrawn' | 'expired' };

export type CreateHelpRequestInput = {
  kind: HelpKind;
  title?: string;
  categories?: string[];
  tags?: string[];
  description?: string;
  approximateLocation?: ApproximateLocation | string | null;
};

export type MapSnapshot = {
  incidents: ApiIncident[];
  notices: OfficialNotice[];
  rendezvousPoints: { id: string; title: string; instructions: string; location: ApproximateLocation; status: string; expiresAt?: string | null }[];
  people: { userId: string; location: ApproximateLocation; precision: string; updatedAt: string }[];
  heatmap: { label: string; latitude?: number; longitude?: number; count: number }[];
  helpFeed: HelpFeedItem[];
  helpRequests: HelpRequest[];
};

async function loadToken() {
  if (tokenLoaded) return accessToken;
  if (Platform.OS === 'web') {
    try { accessToken = globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? null; } catch { accessToken = null; }
  } else {
    accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
  }
  tokenLoaded = true;
  return accessToken;
}

async function saveToken(token: string | null) {
  accessToken = token;
  tokenLoaded = true;
  if (Platform.OS === 'web') {
    try {
      if (token) globalThis.sessionStorage?.setItem(TOKEN_KEY, token);
      else globalThis.sessionStorage?.removeItem(TOKEN_KEY);
    } catch {
      // Keep the session in memory when browser storage is unavailable.
    }
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  if (!API_BASE_URL) throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to mobile/.env.local and restart Expo.');
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (authenticated) {
    const token = await loadToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Could not reach SafeTogether API at ${API_BASE_URL}. Check the server address and network connection.`);
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null) as { error?: string; data?: T } | null;
  if (!response.ok) throw new ApiError(response.status, payload?.error || `Request failed (${response.status})`);
  return (payload && 'data' in payload ? payload.data : payload) as T;
}

function post(path: string, body: unknown, authenticated = true) {
  return request(path, { method: 'POST', body: JSON.stringify(body) }, authenticated);
}

export const api = {
  async register(input: { name: string; email: string; password: string }) {
    const session = await post('/auth/register', input, false) as AuthSession;
    await saveToken(session.token);
    return session;
  },

  async login(input: { email: string; password: string }) {
    const session = await post('/auth/login', input, false) as AuthSession;
    await saveToken(session.token);
    return session;
  },

  async logout() {
    await saveToken(null);
  },

  me: () => request<{ user: ApiUser }>('/auth/me'),
  getMap: () => request<MapSnapshot>('/map'),
  getHelpFeed: () => request<HelpFeedItem[]>('/help-feed'),
  getOffers: () => request<HelpOffer[]>('/offers'),

  createOffer: (input: CreateOfferInput) => post('/offers', input) as Promise<HelpOffer>,
  updateOffer: (offerId: string, input: UpdateOfferInput) => request<HelpOffer>(`/offers/${encodeURIComponent(offerId)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  stopOffering: (offerId: string) => request<HelpOffer>(`/offers/${encodeURIComponent(offerId)}`, { method: 'PATCH', body: JSON.stringify({ status: 'withdrawn' }) }),
  uploadOfferPhoto: (offerId: string, dataUrl: string) => post(`/offers/${encodeURIComponent(offerId)}/attachments`, { data: dataUrl }),

  getHelpRequests: (kind?: 'resource' | 'emergency' | 'event') => request<HelpRequest[]>(`/help-requests${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`),
  createHelpRequest: (input: CreateHelpRequestInput) => post('/help-requests', input) as Promise<HelpRequest>,
  updateHelpRequest: (requestId: string, input: { status?: 'active' | 'resolved' | 'withdrawn' | 'expired'; title?: string; description?: string; approximateLocation?: ApproximateLocation | string | null }) =>
    request<HelpRequest>(`/help-requests/${encodeURIComponent(requestId)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  getMessages: (requestId: string) => request<HelpMessage[]>(`/help-requests/${encodeURIComponent(requestId)}/messages`),
  sendMessage: (requestId: string, text: string) => post(`/help-requests/${encodeURIComponent(requestId)}/messages`, { text }) as Promise<HelpMessage>,

  getIncidents: () => request<ApiIncident[]>('/incidents'),
  createIncident: (input: { category: string; description: string; approximateLocation: ApproximateLocation | string; shareWithAuthorities?: boolean }) => post('/incidents', input),
  uploadIncidentPhoto: (incidentId: string, dataUrl: string) => post(`/incidents/${encodeURIComponent(incidentId)}/attachments`, { data: dataUrl }),
  getNotices: () => request<OfficialNotice[]>('/notices'),
  getRendezvousPoints: () => request<MapSnapshot['rendezvousPoints']>('/rendezvous'),
  getHeatmap: () => request<MapSnapshot['heatmap']>('/heatmap'),

  setLocation: (input: { location: ApproximateLocation | string; visibility: 'private' | 'connections' | 'connections_authorities' | 'everyone'; precision?: 'neighborhood' | 'district' }) =>
    request('/location', { method: 'PUT', body: JSON.stringify(input) }),
  clearLocation: () => request<void>('/location', { method: 'DELETE' }),
  getVisibleLocations: () => request<MapSnapshot['people']>('/locations'),
  getConnections: () => request<{ id: string; status: string; user: ApiUser }[]>('/connections'),
  requestConnection: (email: string) => post('/connections', { email }),
  respondToConnection: (connectionId: string, status: 'accepted' | 'rejected') =>
    request(`/connections/${encodeURIComponent(connectionId)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
