import { useSyncExternalStore } from 'react';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

let status: RealtimeStatus = 'connecting';
const listeners = new Set<() => void>();

export function setRealtimeStatus(next: RealtimeStatus): void {
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

export const getRealtimeStatus = (): RealtimeStatus => status;
const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(subscribe, getRealtimeStatus, () => 'connecting');
}
