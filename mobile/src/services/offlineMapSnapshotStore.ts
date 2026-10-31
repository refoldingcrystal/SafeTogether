import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { MapSnapshot } from '@/services/api';

export type OfflineMapSnapshot = Pick<
  MapSnapshot,
  'incidents' | 'notices' | 'rendezvousPoints' | 'emergencySites' | 'dangerZones' | 'helpFeed'
>;

export type SavedOfflineMapSnapshot = {
  snapshot: OfflineMapSnapshot;
  savedAt: string;
};

type Manifest = { generation: string; chunks: number; savedAt: string };

const MANIFEST_KEY = 'safetogether.offline-map.manifest.v1';
const CHUNK_PREFIX = 'safetogether.offline-map.snapshot.v1';
const CHUNK_LENGTH = 400;
const MAX_SNAPSHOT_LENGTH = 24_000;

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (!globalThis.localStorage) throw new Error('Local storage is unavailable.');
    globalThis.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    try { globalThis.localStorage?.removeItem(key); } catch { /* Best effort cache cleanup. */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function validManifest(value: unknown): value is Manifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as Partial<Manifest>;
  return typeof manifest.generation === 'string'
    && /^[a-z0-9-]{1,48}$/i.test(manifest.generation)
    && Number.isInteger(manifest.chunks) && manifest.chunks! > 0 && manifest.chunks! <= 60
    && typeof manifest.savedAt === 'string' && Number.isFinite(Date.parse(manifest.savedAt));
}

function validSnapshot(value: unknown): value is OfflineMapSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<OfflineMapSnapshot>;
  return Array.isArray(snapshot.incidents)
    && Array.isArray(snapshot.notices)
    && Array.isArray(snapshot.rendezvousPoints)
    && Array.isArray(snapshot.emergencySites)
    && Array.isArray(snapshot.dangerZones)
    && Array.isArray(snapshot.helpFeed);
}

function splitIntoChunks(value: string) {
  const chunks: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + CHUNK_LENGTH, value.length);
    const lastCode = value.charCodeAt(end - 1);
    if (lastCode >= 0xd800 && lastCode <= 0xdbff) end -= 1;
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks;
}

async function readManifest(): Promise<Manifest | null> {
  try {
    const raw = await getItem(MANIFEST_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const offlineMapSnapshotStore = {
  async load(): Promise<SavedOfflineMapSnapshot | null> {
    try {
      const manifest = await readManifest();
      if (!manifest) return null;
      const parts = await Promise.all(Array.from({ length: manifest.chunks }, (_, index) =>
        getItem(`${CHUNK_PREFIX}.${manifest.generation}.${index}`),
      ));
      if (parts.some((part) => part === null)) return null;
      const parsed: unknown = JSON.parse(parts.join(''));
      if (!validSnapshot(parsed)) return null;
      return { snapshot: parsed, savedAt: manifest.savedAt };
    } catch {
      return null;
    }
  },

  async save(snapshot: MapSnapshot): Promise<string> {
    const offlineSnapshot: OfflineMapSnapshot = {
      incidents: snapshot.incidents,
      notices: snapshot.notices,
      rendezvousPoints: snapshot.rendezvousPoints,
      emergencySites: snapshot.emergencySites,
      dangerZones: snapshot.dangerZones,
      helpFeed: snapshot.helpFeed.filter((item) => !item.isMine),
    };
    const serialized = JSON.stringify(offlineSnapshot);
    if (serialized.length > MAX_SNAPSHOT_LENGTH) {
      throw new Error('The current map snapshot is too large to save offline.');
    }

    const chunks = splitIntoChunks(serialized);
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const savedAt = new Date().toISOString();
    const previous = await readManifest();
    await Promise.all(chunks.map((chunk, index) => setItem(`${CHUNK_PREFIX}.${generation}.${index}`, chunk)));
    await setItem(MANIFEST_KEY, JSON.stringify({ generation, chunks: chunks.length, savedAt } satisfies Manifest));

    if (previous) {
      await Promise.all(Array.from({ length: previous.chunks }, (_, index) =>
        deleteItem(`${CHUNK_PREFIX}.${previous.generation}.${index}`),
      )).catch(() => undefined);
    }
    return savedAt;
  },
};
