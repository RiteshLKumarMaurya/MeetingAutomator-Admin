'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { isNetworkError } from '@/lib/apiClient';

/**
 * The one and only place logout logic lives. Composes:
 *   1. Best-effort backend logout call (revokes refresh token server-side).
 *      Network failure here must not block local logout — the user still
 *      needs to be signed out of THIS device even if we're offline.
 *   2. Clear Zustand auth state.
 *   3. Clear the React Query cache so no stale user/admin data survives
 *      into the next session on this device.
 *   4. Redirect exactly once (guarded against double-invocation from, e.g.,
 *      a fast double-click or a race with the session-expired listener).
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const inFlight = useRef(false);

  return useCallback(
    async (options?: { redirectTo?: string; silent?: boolean }) => {
      if (inFlight.current) return;
      inFlight.current = true;

      try {
        await authApi.logout();
      } catch (err) {
        // Backend unreachable or already-invalid session — fine, we still
        // proceed with local logout. Only rethrow truly unexpected cases
        // is unnecessary here; either way the user is logged out locally.
        if (!isNetworkError(err)) {
          // Backend responded (e.g. 401 because session was already dead) —
          // that's expected and not worth surfacing.
        }
      }

      clearAuth();
      queryClient.clear();

      router.replace(options?.redirectTo ?? '/login');

      // Allow future logout calls once this one has fully settled.
      inFlight.current = false;
    },
    [clearAuth, queryClient, router]
  );
}
