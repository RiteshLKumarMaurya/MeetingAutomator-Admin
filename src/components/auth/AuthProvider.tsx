'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi, userApi } from '@/services/api';
import { isAuthError } from '@/lib/apiClient';
import { useNetworkStatusEffect } from '@/hooks/useNetworkStatus';

/**
 * Owns the app-boot authentication lifecycle:
 *
 *   1. Wait for the Zustand `persist` middleware to rehydrate from
 *      localStorage (isHydrated). Nothing below reads auth state before
 *      this — reading pre-hydration state was the source of the
 *      "sometimes lands on Home without a proper login" race.
 *   2. If a persisted access token exists, validate it against the
 *      backend once, up front. A network error during this validation
 *      leaves the persisted session intact (optimistic — we trust the
 *      locally persisted state until the backend explicitly says
 *      otherwise). A genuine 401/403 clears it.
 *   3. Listen for 'auth:session-expired', dispatched only by apiClient
 *      when the backend has definitively rejected a refresh attempt —
 *      never for network errors. This is the sole trigger for a forced
 *      logout outside of explicit user action.
 *
 * Route-level guards (e.g. dashboard/layout.tsx) read `status` from the
 * store and simply wait for it to leave 'idle'/'authenticating' before
 * making any redirect decision.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Single, app-wide registration of online/offline listeners — see
  // useNetworkStatus.ts for why this must be called from exactly one
  // place. Any component (e.g. the dashboard's offline banner) reads the
  // resulting status via the read-only `useNetworkStatus()` hook.
  useNetworkStatusEffect();

  // ── Boot-time validation of a persisted session ──────────────────────
  useEffect(() => {
    if (!isHydrated || status !== 'authenticating') return;

    let cancelled = false;

    (async () => {
      if (!accessToken) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const { data } = await authApi.validateToken(accessToken);
        if (cancelled) return;

        if (data?.data) {
          // Token confirmed valid — fetch the current user profile so the
          // store is fully populated (covers the case where the app was
          // reopened after a long time and persisted `user` is stale).
          const me = await userApi.getMe();
          if (cancelled) return;
          setUser(me.data.data);
          setStatus('authenticated');
        } else {
          if (cancelled) return;
          clearAuth();
        }
      } catch (err) {
        if (cancelled) return;

        if (isAuthError(err)) {
          // Backend explicitly rejected the token (401/403) — genuine,
          // confirmed auth failure.
          clearAuth();
        } else {
          // Network failure OR backend 5xx (down, deploying, overloaded).
          // Neither is evidence the session is invalid — stay logged in
          // optimistically. apiClient's interceptor will re-validate (and
          // refresh if needed) on the next real request once the backend
          // is reachable again, and useNetworkStatus retries on reconnect.
          setStatus('authenticated');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, status, accessToken]);

  // ── Listen for definitive, backend-confirmed session expiry ──────────
  useEffect(() => {
    const handler = () => {
      clearAuth();
      queryClient.clear();
      toast.error('Session expired. Please sign in again.');
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [clearAuth, queryClient]);

  // ── Cross-tab sync: logout (or login) in one tab must propagate ──────
  // Zustand's `persist` middleware only writes to localStorage on local
  // `set()` calls; it does not listen for changes made by OTHER tabs. Two
  // tabs open at once therefore have independent in-memory copies of the
  // store that can silently diverge — most importantly, logging out in
  // Tab A left Tab B still believing it was authenticated, with a stale
  // token, until its next request happened to 401. The native `storage`
  // event fires in every OTHER tab whenever one tab writes to
  // localStorage, which is exactly the signal needed to keep them in sync.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'meetingautomator-admin-auth') return;

      // Another tab cleared auth (logged out) — mirror it here immediately,
      // rather than waiting for this tab's own next failed request.
      if (!event.newValue) {
        clearAuth();
        queryClient.clear();
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        const newAccessToken = parsed?.state?.accessToken ?? null;
        const newIsAuthenticated = !!parsed?.state?.isAuthenticated;

        if (!newIsAuthenticated || !newAccessToken) {
          // Other tab logged out (or never had a session) — sync that.
          clearAuth();
          queryClient.clear();
        } else if (newAccessToken !== useAuthStore.getState().accessToken) {
          // Other tab logged in, or refreshed to a newer token — adopt it
          // so this tab doesn't keep using a stale/rotated-out token.
          useAuthStore.getState().setTokens(newAccessToken, parsed.state.refreshToken);
          if (parsed.state.user) {
            useAuthStore.getState().setUser(parsed.state.user);
          }
          useAuthStore.getState().setStatus('authenticated');
        }
      } catch {
        // Malformed storage value — ignore, don't let this crash the tab.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearAuth, queryClient]);

  return <>{children}</>;
}
