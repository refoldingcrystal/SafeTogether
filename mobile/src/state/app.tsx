import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';

export type Route = 'basement' | 'evacuation' | null;

type AppState = {
  shelling: boolean;
  sos: boolean;
  offline: boolean;
  /** 0..3 – how far the SOS packet has travelled along the mesh chain. */
  meshStep: number;
  notification: boolean;
  p2pReceived: boolean;
  route: Route;
  setShelling: (v: boolean) => void;
  setSos: (v: boolean) => void;
  setOffline: (v: boolean) => void;
  setRoute: (r: Route) => void;
  dismissNotification: () => void;
  reset: () => void;
};

const Ctx = createContext<AppState | null>(null);

const HOP_MS = 1400;

export function AppProvider({ children }: { children: ReactNode }) {
  const [shelling, setShellingRaw] = useState(false);
  const [sos, setSosRaw] = useState(false);
  const [offline, setOffline] = useState(false);
  const [meshStep, setMeshStep] = useState(0);
  const [notification, setNotification] = useState(false);
  const [p2pReceived, setP2pReceived] = useState(false);
  const [route, setRoute] = useState<Route>(null);

  // Offline demo timeline: packet hops through the mesh, then a P2P offer arrives.
  useEffect(() => {
    if (!offline) return;
    const timers = [1, 2, 3].map((step) => setTimeout(() => setMeshStep(step), step * HOP_MS + 800));
    timers.push(
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNotification(true);
        setP2pReceived(true);
      }, 3 * HOP_MS + 3000),
    );
    return () => timers.forEach(clearTimeout);
  }, [offline]);

  const value: AppState = {
    shelling,
    sos,
    offline,
    meshStep: offline ? meshStep : 0,
    notification,
    p2pReceived,
    route,
    setShelling: (v) => {
      if (v) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShellingRaw(v);
    },
    setSos: (v) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setSosRaw(v);
    },
    setOffline: (v) => {
      setMeshStep(0);
      setOffline(v);
    },
    setRoute,
    dismissNotification: () => setNotification(false),
    reset: () => {
      setShellingRaw(false);
      setSosRaw(false);
      setOffline(false);
      setMeshStep(0);
      setNotification(false);
      setP2pReceived(false);
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
