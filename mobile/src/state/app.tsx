import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import mock from '@/data/mock.json';

export type Route = 'basement' | 'evacuation' | null;

/**
 * What the mesh is doing right now. Kept deliberately small so every state has one clear message:
 * - standby: internet works, mesh is idle.
 * - discovering: offline, looking for nearby phones; nothing handed over yet.
 * - relaying: offline, at least one queued message was handed to a nearby phone (not a delivery receipt).
 */
export type MeshStatus = 'standby' | 'discovering' | 'relaying';

export type QueuedAction = {
  id: string;
  kind: 'sos' | 'safe' | 'report' | 'shelter' | 'need' | 'danger' | 'family' | 'help';
  label: string;
  createdAt: string;
  /** Sent with every message so people nearby can find you. Demo position until GPS is wired in. */
  location: { latitude: number; longitude: number };
  /** How many nearby phones took a copy (simulated). */
  seenBy: number;
  /** `relayed` only means a nearby phone took a copy – never that responders received it. */
  status: 'queued' | 'relayed';
};

/** A message another phone passed to us over the mesh. Unverified unless signed by an authority. */
export type MeshMessage = (typeof mock.meshInbox)[number] & { receivedAt: string };

type AppState = {
  shelling: boolean;
  sos: boolean;
  offline: boolean;
  /** Why we are offline: the device really lost internet, or the presenter is simulating it. */
  offlineSource: 'device' | 'demo' | null;
  meshStatus: MeshStatus;
  /** 0..3 – how far the newest queued message has travelled along the simulated mesh chain. */
  meshStep: number;
  queue: QueuedAction[];
  /** Messages received from nearby phones (simulation only for now). */
  inbox: MeshMessage[];
  /** Last confirmed exchange with the server. Always null until a backend exists. */
  lastSyncAt: string | null;
  p2pReceived: boolean;
  /** Id of the nearby message you said "I can help" to, if any. */
  helping: string | null;
  route: Route;
  setShelling: (v: boolean) => void;
  setSos: (v: boolean) => void;
  setOffline: (v: boolean) => void;
  enqueue: (kind: QueuedAction['kind'], label: string) => void;
  /** Reply "I'm coming" to a nearby message and start the finder. */
  respond: (message: MeshMessage) => void;
  stopHelping: () => void;
  setRoute: (r: Route) => void;
  reset: () => void;
};

const Ctx = createContext<AppState | null>(null);

const HOP_MS = 1400;

export function AppProvider({ children }: { children: ReactNode }) {
  const [shelling, setShellingRaw] = useState(false);
  const [sos, setSosRaw] = useState(false);
  const [deviceOffline, setDeviceOffline] = useState(false);
  const [demoOffline, setDemoOffline] = useState(false);
  const [meshStep, setMeshStep] = useState(0);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [inbox, setInbox] = useState<MeshMessage[]>([]);
  const [p2pReceived, setP2pReceived] = useState(false);
  const [helping, setHelping] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(null);

  const offline = deviceOffline || demoOffline;
  const offlineSource = deviceOffline ? 'device' : demoOffline ? 'demo' : null;
  // Whenever the internet is gone, the mesh takes over and passes messages between nearby phones.
  const relaying = offline;
  const latestId = queue.at(-1)?.id;

  // Follow the device's real connectivity.
  useEffect(() => {
    const isOffline = (s: Network.NetworkState) => s.isConnected === false || s.isInternetReachable === false;
    let last: boolean | null = null;
    const apply = (s: Network.NetworkState) => {
      const next = isOffline(s);
      if (next === last) return; // e.g. Wi-Fi → cellular: nothing changed for us
      last = next;
      setDeviceOffline(next);
    };
    Network.getNetworkStateAsync()
      .then(apply)
      .catch(() => {});
    const sub = Network.addNetworkStateListener(apply);
    return () => sub.remove();
  }, []);

  // Simulated relay: the newest queued message hops through the demo chain one phone at a time.
  useEffect(() => {
    if (!relaying || !latestId) return;
    const timers = [1, 2, 3].map((step) =>
      setTimeout(() => {
        setMeshStep(step);
        setQueue((q) => q.map((item) => ({ ...item, status: 'relayed', seenBy: Math.max(item.seenBy, step) })));
      }, step * HOP_MS + 800),
    );
    return () => {
      timers.forEach(clearTimeout);
      setMeshStep(0);
    };
  }, [relaying, latestId]);

  // Simulated messages from nearby phones trickle in.
  useEffect(() => {
    if (!relaying) return;
    const timers = mock.meshInbox.map((msg) =>
      setTimeout(() => {
        setInbox((list) =>
          list.some((m) => m.id === msg.id) ? list : [{ ...msg, receivedAt: new Date().toISOString() }, ...list],
        );
        if (msg.id === 'basement') setP2pReceived(true);
      }, msg.arrivesAfterMs),
    );
    return () => timers.forEach(clearTimeout);
  }, [relaying]);

  // Once your own SOS has left this phone, a neighbour answers it over the mesh.
  const sosPassedOn = relaying && queue.some((q) => q.kind === 'sos' && q.status === 'relayed');
  useEffect(() => {
    if (!sosPassedOn) return;
    const reply = mock.meshReply;
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInbox((list) => (list.some((m) => m.id === reply.id) ? list : [{ ...reply, receivedAt: new Date().toISOString() }, ...list]));
    }, reply.arrivesAfterMs);
    return () => clearTimeout(t);
  }, [sosPassedOn]);

  const meshStatus: MeshStatus = !offline ? 'standby' : queue.some((q) => q.status === 'relayed') ? 'relaying' : 'discovering';

  const enqueue = (kind: QueuedAction['kind'], label: string) =>
    setQueue((q) => [
      ...q,
      {
        id: `${kind}-${Date.now().toString(36)}`,
        kind,
        label,
        createdAt: new Date().toISOString(),
        location: mock.me,
        seenBy: 0,
        status: 'queued',
      },
    ]);

  const value: AppState = {
    shelling,
    sos,
    offline,
    offlineSource,
    meshStatus,
    meshStep: relaying ? meshStep : 0,
    queue,
    inbox,
    lastSyncAt: null,
    p2pReceived,
    helping,
    route,
    setShelling: (v) => {
      if (v) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShellingRaw(v);
    },
    setSos: (v) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setSosRaw(v);
      if (v && offline) enqueue('sos', 'SOS');
      if (!v) {
        // An SOS still on this phone can simply be withdrawn; one already passed on needs a follow-up.
        const relayed = queue.some((q) => q.kind === 'sos' && q.status === 'relayed');
        setQueue((q) => q.filter((item) => !(item.kind === 'sos' && item.status === 'queued')));
        if (relayed) enqueue('safe', '“I am safe” update');
      }
    },
    setOffline: setDemoOffline,
    enqueue,
    respond: (m) => {
      setHelping(m.id);
      enqueue('help', `Coming to help · ${m.title}`);
    },
    stopHelping: () => setHelping(null),
    setRoute,
    reset: () => {
      setShellingRaw(false);
      setSosRaw(false);
      setDemoOffline(false);
      setMeshStep(0);
      setQueue([]);
      setInbox([]);
      setP2pReceived(false);
      setHelping(null);
      setRoute(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
