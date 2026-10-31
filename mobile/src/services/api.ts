import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ApproximateLocation, IncidentCategory, IncidentStatus, OfficialNotice, PersonalHelpCategory, VerificationStatus } from '@/shared/models';

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
export type AuthSession = { token: string; user: ApiUser; created?: boolean };
export type HelpKind = 'resource' | 'emergency' | 'Request resources' | 'Emergency';
export type ApiIncident = {
  id: string;
  reporterName: string;
  category: IncidentCategory;
  description: string;
  approximateLocation: ApproximateLocation;
  submittedAt: string;
  updatedAt: string;
  source: 'community' | 'authority';
  verificationStatus: VerificationStatus;
  status: IncidentStatus;
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
  isMine?: boolean;
  status: string;
  createdAt: string;
  approximateLocation?: ApproximateLocation | null;
};

export type HelpRequest = HelpFeedItem & { type: 'request'; kind: 'resource' | 'emergency' };
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
  emergencySites: EmergencySite[];
  dangerZones: DangerZone[];
  people: { userId: string; location: ApproximateLocation; precision: string; updatedAt: string }[];
  heatmap: { label: string; latitude?: number; longitude?: number; count: number }[];
  helpFeed: HelpFeedItem[];
  helpRequests: HelpRequest[];
};

export type Coordinate = { latitude: number; longitude: number };
export type EmergencySite = { id: string; kind: 'shelter' | 'safe_zone' | 'aid'; title: string; summary: string; coordinate: Coordinate; capacity?: string; status: string; expiresAt?: string | null };
export type DangerZone = { id: string; kind: 'attack' | 'fire' | 'flooding'; title: string; summary: string; coordinate: Coordinate; radius: number; severity: 'critical' | 'high' | 'medium'; status: string; expiresAt?: string | null };

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
  isConfigured: Boolean(API_BASE_URL),

  realtimeTranscriptionToken: () => request<{ token: string }>('/transcribe/token', { method: 'POST' }),
  async transcribeRecording(uri: string) {
    const { File } = await import('expo-file-system');
    const body = await new File(uri).arrayBuffer();
    return request<{ text: string }>('/transcribe', { method: 'POST', body, headers: { 'content-type': 'audio/wav' } });
  },
  async login(input: { id: string }) {
    try {
      const session = await post('/auth/id/login', input, false) as AuthSession;
      await saveToken(session.token);
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && error.message === 'Sign-in required') {
        throw new Error('The API server is outdated. Restart it to load ID sign-in, then try again.');
      }
      throw error;
    }
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

  getHelpRequests: (kind?: 'resource' | 'emergency' | 'event') => request<HelpRequest[]>(`/help-requests${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`),
  createHelpRequest: (input: CreateHelpRequestInput) => post('/help-requests', input) as Promise<HelpRequest>,
  updateHelpRequest: (requestId: string, input: { status?: 'active' | 'resolved' | 'withdrawn' | 'expired'; title?: string; description?: string; approximateLocation?: ApproximateLocation | string | null }) =>
    request<HelpRequest>(`/help-requests/${encodeURIComponent(requestId)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  getMessages: (requestId: string) => request<HelpMessage[]>(`/conversations/${encodeURIComponent(requestId)}/messages`),
  sendMessage: (requestId: string, text: string) => post(`/conversations/${encodeURIComponent(requestId)}/messages`, { text }) as Promise<HelpMessage>,

  getIncidents: () => request<ApiIncident[]>('/incidents'),
  createIncident: (input: { category: PersonalHelpCategory; description?: string; approximateLocation: ApproximateLocation | string; shareWithAuthorities?: boolean }) => request<{ id: string }>('/incidents', { method: 'POST', body: JSON.stringify(input) }),
  deleteIncident: (incidentId: string) => request<void>(`/incidents/${encodeURIComponent(incidentId)}`, { method: 'DELETE' }),
  getNotices: () => request<OfficialNotice[]>('/notices'),
  getRendezvousPoints: () => request<MapSnapshot['rendezvousPoints']>('/rendezvous'),
  getEmergencySites: () => request<EmergencySite[]>('/emergency-sites'),
  publishEmergencySite: (input: Omit<EmergencySite, 'id' | 'status'>) => post('/emergency-sites', input),
  updateEmergencySite: (id: string, status: 'active' | 'withdrawn' | 'completed') => request<EmergencySite>(`/emergency-sites/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getDangerZones: () => request<DangerZone[]>('/danger-zones'),
  publishDangerZone: (input: Omit<DangerZone, 'id' | 'status'>) => post('/danger-zones', input),
  updateDangerZone: (id: string, input: { status?: 'active' | 'withdrawn' | 'expired'; expiresAt?: string | null }) => request<DangerZone>(`/danger-zones/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  getHeatmap: () => request<MapSnapshot['heatmap']>('/heatmap'),

  setLocation: (input: { location: ApproximateLocation | string; visibility: 'private' | 'connections' | 'connections_authorities' | 'everyone'; precision?: 'neighborhood' | 'district' }) =>
    request('/location', { method: 'PUT', body: JSON.stringify(input) }),
  clearLocation: () => request<void>('/location', { method: 'DELETE' }),
  getVisibleLocations: () => request<MapSnapshot['people']>('/locations'),
  getConnections: () => request<{ id: string; status: string; user: ApiUser }[]>('/connections'),
  requestConnection: (userId: string) => post('/connections', { userId }),
  respondToConnection: (connectionId: string, status: 'accepted' | 'rejected') =>
    request(`/connections/${encodeURIComponent(connectionId)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
