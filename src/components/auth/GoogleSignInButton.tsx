'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import Script from 'next/script';

import { Loader2 } from 'lucide-react';

import { useGoogleAuth, type GoogleAuthSuccessResult } from '@/hooks/useGoogleAuth';

interface GoogleSignInButtonProps {
  redirectTo?: string;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  onSuccess?: (result: GoogleAuthSuccessResult) => void;
}

export function GoogleSignInButton({
  redirectTo = '/',
  text = 'continue_with',
  onSuccess,
}: GoogleSignInButtonProps) {
  const buttonRef =
    useRef<HTMLDivElement>(null);

  const {
    loading,
    renderGoogleButton,
  } = useGoogleAuth(onSuccess);

  const [
    scriptLoaded,
    setScriptLoaded,
  ] = useState(() => {
    if (typeof window === 'undefined')
      return false;

    return !!window.google?.accounts?.id;
  });

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.google?.accounts?.id
    ) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded) return;

    if (!buttonRef.current) return;

    renderGoogleButton(
      buttonRef.current,
      redirectTo,
      text
    );
  }, [
    scriptLoaded,
    redirectTo,
    renderGoogleButton,
  ]);

  const hasGoogleClientId = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '340916159203-4nh8gjnhkp50sql9dco5a1mr324u1hjp.apps.googleusercontent.com'
  );

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setScriptLoaded(false)}
      />

      {loading ? (
        <div className="flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white text-sm font-medium text-gray-700">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </div>
      ) : (
        <div className="w-full">
          <div
            ref={buttonRef}
            className="min-h-11 w-full overflow-hidden rounded-xl"
            style={{ colorScheme: 'light' }}
          />

          {!scriptLoaded && hasGoogleClientId && (
            <div className="flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white text-sm font-medium text-gray-700">
              Loading Google...
            </div>
          )}
        </div>
      )}
    </>
  );
}