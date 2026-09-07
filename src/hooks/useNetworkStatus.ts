'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Module-level connectivity store, shared by every component that cares
 * about online/offline status. Only ONE component (AuthProvider, mounted
 * once at the app root) should call `useNetworkStatusEffect()` below to
 * actually register the `online`/`offline` listeners and drive recovery.
 * Everyone else — e.g. the dashboard layout's offline banner — reads the
 * current value via `useNetworkStatus()`, which subscribes to this shared
 * store instead of adding a second pair of window listeners. This avoids
 * duplicate listener registration when multiple components on the same
 * page want to know "are we online right now?"
 */
let isOnlineValue = typeof navigator !== 'undefined' ? navigator.onLine : true;
const subscribers = new Set<() => void>();

function setOnline(value: boolean) {
  isOnlineValue = value;
  subscribers.forEach((cb) => cb());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Read-only hook: current connectivity status, reactive, no side effects,
 * no listener registration. Safe to call from as many components as
 * needed.
 */
export function useNetworkStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isOnlineValue,
    () => true // server snapshot — assume online during SSR
  );
}

/**
 * The single place `online`/`offline` window listeners are actually
 * registered. Call this exactly once, from AuthProvider at the app root.
 * On reconnect, re-runs any React Query queries that failed while
 * offline — this is what lets a temporary connectivity loss recover
 * silently instead of requiring a manual refresh or forcing a logout.
 */
export function useNetworkStatusEffect() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      queryClient.invalidateQueries({
        predicate: (query) => query.state.status === 'error',
      });
      queryClient.resumePausedMutations();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);
}
