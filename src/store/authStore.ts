import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfileResponse } from '@/types';

/**
 * Single source of truth for authentication state.
 *
 * IMPORTANT: Tokens live ONLY here (via zustand persist, backed by
 * localStorage key 'meetingautomator-admin-auth'). Nothing else in the app should
 * read or write raw `localStorage.getItem('accessToken')` etc. — that
 * created a second, independently-mutable copy of auth state that could
 * desync from this store (the root cause of "sometimes lands on Home
 * without a proper login" after reload/reopen).
 *
 * `apiClient.ts` reads tokens via `useAuthStore.getState()` instead of
 * localStorage directly.
 */

export type AuthStatus =
  | 'idle'           // store not yet rehydrated from storage
  | 'authenticating' // validating a persisted session on boot
  | 'authenticated'
  | 'unauthenticated';

interface AuthState {
  user: UserProfileResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  status: AuthStatus;

  setHydrated: (hydrated: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  setAuth: (
    user: UserProfileResponse,
    accessToken: string,
    refreshToken: string
  ) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: UserProfileResponse) => void;
  clearAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      status: 'idle',

      setHydrated: (isHydrated) => set({ isHydrated }),
      setStatus: (status) => set({ status }),

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          status: 'authenticated',
        });
      },

      // Used by the refresh flow to rotate tokens without touching user/auth flags.
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),

      setUser: (user) => set({ user }),

      // Local-only state clear. Does not talk to the network or the query
      // cache — callers that need the full teardown (cache, redirect) should
      // use the `useLogout()` hook instead, which composes this.
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          status: 'unauthenticated',
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          status: 'unauthenticated',
        });
      },
    }),
    {
      name: 'meetingautomator-admin-auth',

      onRehydrateStorage: () => (state) => {
        // Runs once, after persisted state has been read from localStorage.
        // Everything that guards protected UI must wait for this before
        // making any authenticated/unauthenticated decision.
        state?.setHydrated(true);
        if (state?.accessToken) {
          state.setStatus('authenticating');
        } else {
          state?.setStatus('unauthenticated');
        }
      },

      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
