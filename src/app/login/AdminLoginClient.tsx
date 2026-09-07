'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, LockKeyhole, ArrowRight, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export function AdminLoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/dashboard';
  const hydrated = useAuthStore((s) => s.isHydrated);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && authenticated && user?.roleName === 'ROLE_ADMIN') router.replace(redirectTo);
  }, [hydrated, authenticated, user, router, redirectTo]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await authApi.phoneLogin({
        fullPhoneNumber: phone.trim(),
        password,
        device: 'meeting-automator-admin',
      });
      const result = data.data;
      if (result.userProfileResponse.roleName !== 'ROLE_ADMIN') {
        throw new Error('This account does not have administrator access.');
      }
      setAuth(result.userProfileResponse, result.tokenResponse.accessToken, result.tokenResponse.refreshToken);
      toast.success('Welcome to the Meeting Automator control center.');
      router.replace(redirectTo);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = (result: any) => {
    if (result.user?.roleName !== 'ROLE_ADMIN') {
      toast.error('This Google account does not have administrator access.');
      return;
    }
    setAuth(result.user, result.tokens.accessToken, result.tokens.refreshToken);
    router.replace(redirectTo);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white selection:bg-brand-500/30">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <img src="/logos/logo-mark.png" alt="Meeting Automator" className="h-10 w-10 object-contain" />
            <div><p className="font-semibold tracking-tight">Meeting Automator</p><p className="text-xs text-white/45">Independent Admin Control Center</p></div>
          </div>
          <div className="relative max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-medium text-white/70"><Activity className="h-3.5 w-3.5 text-brand-400" /> Operations online</div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] xl:text-6xl">One control center for the entire meeting workflow.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/55">Manage consultations, availability, leads, content, packages, services, users, notifications and every operational setting from one protected workspace.</p>
            <div className="mt-9 grid grid-cols-2 gap-3">
              {['Booking operations', 'Content management', 'Access control', 'Notifications'].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-4 text-sm text-white/70">{item}</div>)}
            </div>
          </div>
          <p className="relative text-xs text-white/30">Administrator access is enforced by the backend ROLE_ADMIN authority.</p>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden flex items-center gap-3"><img src="/logos/logo-mark.png" alt="Meeting Automator" className="h-9 w-9" /><div><p className="font-semibold">Meeting Automator</p><p className="text-xs text-white/45">Admin Control Center</p></div></div>
            <div className="rounded-3xl border border-white/10 bg-white/[.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-7"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300"><ShieldCheck className="h-5 w-5" /></div><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-300/80">Secure administrator sign-in</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Open control center</h2><p className="mt-2 text-sm leading-6 text-white/45">Use an administrator account to continue.</p></div>
              <div className="space-y-4"><GoogleSignInButton text="signin_with" onSuccess={handleGoogle} /><div className="flex items-center gap-3 text-[11px] uppercase tracking-[.16em] text-white/25"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div></div>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-white/55">Phone number</span><input required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="username" placeholder="+91..." className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10" /></label>
                <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/55"><LockKeyhole className="h-3.5 w-3.5" />Password</span><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Administrator password" className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10" /></label>
                <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Signing in…' : 'Continue to dashboard'}{!busy && <ArrowRight className="h-4 w-4" />}</button>
              </form>
              <p className="mt-5 text-center text-[11px] leading-5 text-white/30">Your credentials are sent only to the Meeting Automator backend. No password is stored by this frontend.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
