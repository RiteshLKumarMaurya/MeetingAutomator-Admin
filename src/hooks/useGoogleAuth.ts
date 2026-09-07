'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;

          renderButton: (
            element: HTMLElement,
            options: object
          ) => void;

          prompt: () => void;

          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export interface GoogleAuthSuccessResult {
  user: import('@/types').UserProfileResponse;
  tokens: import('@/types').TokenResponse;
}

export function useGoogleAuth(
  onSuccess?: (result: GoogleAuthSuccessResult) => void
) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const initialized = useRef(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  const handleCredentialResponse = useCallback(
    async (credential: string, redirectTo = '/') => {
      try {
        setLoading(true);

        const { data } = await authApi.googleLogin({
          idToken: credential,
          device: 'meeting-automator-admin',
        });

        const { user, tokens } = data.data;

        if (onSuccess) {
          onSuccess({ user, tokens });
          return;
        }

        setAuth(
          user,
          tokens.accessToken,
          tokens.refreshToken
        );

        toast.success(
          `Welcome ${
            user.fullName
              ? user.fullName.split(' ')[0]
              : ''
          }`
        );

        router.push(redirectTo);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message ??
            'Google login failed.'
        );
      } finally {
        setLoading(false);
      }
    },
    [router, setAuth, onSuccess]
  );

  const initializeGoogle = useCallback(
    (redirectTo = '/') => {
      if (
        initialized.current ||
        !window.google
      ) {
        return;
      }

      // Google OAuth client IDs are public browser-side configuration.
      // Keep the deployed client available even when a local .env file is
      // missing, so the login button never silently disappears.
      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        '340916159203-4nh8gjnhkp50sql9dco5a1mr324u1hjp.apps.googleusercontent.com';

      window.google.accounts.id.initialize({
        client_id: clientId,

        callback: (response) =>
          handleCredentialResponse(
            response.credential,
            redirectTo
          ),

        auto_select: false,

        cancel_on_tap_outside: true,
      });

      initialized.current = true;
    },
    [handleCredentialResponse]
  );

  const renderGoogleButton = useCallback(
    (
      element: HTMLElement,
      redirectTo = '/',
      buttonText: 'signin_with' | 'signup_with' | 'continue_with' | 'signin' = 'continue_with'
    ) => {
      if (!window.google) return;

      initializeGoogle(redirectTo);

      element.innerHTML = '';

      window.google.accounts.id.renderButton(
        element,
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          shape: 'rectangular',
          text: buttonText,
          logo_alignment: 'left',
        }
      );
    },
    [initializeGoogle]
  );

  return {
    loading,
    renderGoogleButton,
  };
}