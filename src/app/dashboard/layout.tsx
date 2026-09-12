'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, FolderKanban, Package, Layers, Cpu,
  Image, Star, ListChecks, Link2, Globe, Settings, Users, ShieldCheck,
  Menu, LogOut, ChevronRight, Layers2, ChevronDown, Bell, CalendarDays, Tag, PanelTop,
} from 'lucide-react';
import { useMe } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useLogout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { isAuthError, isTransientError } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true, group: 'Workspace' },
  { href: '/dashboard/bookings', label: 'Consultations', icon: CalendarDays, exact: true, group: 'Workspace' },
  { href: '/dashboard/bookings/settings', label: 'Booking Settings', icon: Settings, exact: true, group: 'Workspace' },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban, group: 'Business' },
  { href: '/dashboard/bundles', label: 'Project Bundles', icon: Layers2, group: 'Business' },
  { href: '/dashboard/packages', label: 'Packages', icon: Package, group: 'Business' },
  { href: '/dashboard/offers', label: 'Offers', icon: Tag, group: 'Business' },
  { href: '/dashboard/services', label: 'Services', icon: Layers, group: 'Business' },
  { href: '/dashboard/technologies', label: 'Technologies', icon: Cpu, group: 'Content' },
  { href: '/dashboard/testimonials', label: 'Testimonials', icon: Star, group: 'Content' },
  { href: '/dashboard/features', label: 'Features', icon: ListChecks, group: 'Content' },
  { href: '/dashboard/banners', label: 'Banners', icon: Image, group: 'Content' },
  { href: '/dashboard/site-modules', label: 'Site Modules', icon: PanelTop, group: 'Content' },
  { href: '/dashboard/web-links', label: 'Web Links', icon: Link2, group: 'Content' },
  { href: '/dashboard/links', label: 'Links', icon: Link2, group: 'Content' },
  { href: '/dashboard/users', label: 'Users', icon: Users, group: 'Access' },
  { href: '/dashboard/roles', label: 'Roles', icon: ShieldCheck, group: 'Access' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, group: 'System' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, group: 'System' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isHydrated = useAuthStore((s) => s.isHydrated);
  const authStatus = useAuthStore((s) => s.status);
  const isOnline = useNetworkStatus();

  // Only run `useMe()` once we are confirmed authenticated. Deliberately
  // NOT enabled during 'authenticating' — that phase is owned exclusively
  // by AuthProvider's boot-time validation (authApi.validateToken +
  // userApi.getMe), which already populates the store's `user`. Enabling
  // this query during 'authenticating' too caused a duplicate /users/me
  // request racing AuthProvider's own call on every cold boot.
  const authReady = isHydrated && authStatus === 'authenticated';
  const { data: me, isLoading, isError, error } = useMe({
    enabled: authReady,
  });

  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for hydration — never make a redirect decision on default/initial
    // state, which is indistinguishable from "logged out."
    if (!isHydrated) return;

    // No persisted session at all: this is a real, confirmed
    // unauthenticated state (set explicitly by the store's rehydrate
    // callback), not a loading/error ambiguity.
    if (authStatus === 'unauthenticated') {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Still validating a persisted session on boot, or the profile query
    // hasn't settled yet — keep waiting, do not redirect.
    if (authStatus === 'authenticating' || isLoading) return;

    // Transient failures — offline, timeout, or the backend returning a
    // 5xx (down, mid-deploy, overloaded) — must NEVER redirect to login.
    // These say nothing about whether the session is valid; the query
    // will retry on its own, and reconnect handling will nudge it further.
    if (isError && isTransientError(error)) return;

    // Only a confirmed backend rejection (401/403 that survived the
    // refresh attempt in apiClient) or an explicit "wrong role" response
    // is allowed to redirect. A generic/unclassified error is treated as
    // transient too, out of caution — we never want an edge-case error
    // shape to force a logout.
    if ((isError && isAuthError(error)) || (me && me.roleName !== 'ROLE_ADMIN')) {
      router.replace('/login');
    }
  }, [isHydrated, authStatus, me, isLoading, isError, error, pathname, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
  };

  // Block render while we genuinely don't know the auth state yet
  // (pre-hydration, actively validating a persisted session on boot, or
  // confirmed unauthenticated but the redirect effect above hasn't
  // navigated away yet). Once authenticated, a background refetch of `me`
  // (e.g. after reconnect) must NOT blank the screen — only the very
  // first load does.
  const showBootLoader =
    !isHydrated ||
    authStatus === 'authenticating' ||
    authStatus === 'unauthenticated' ||
    (authStatus === 'authenticated' && isLoading && !me);

  if (showBootLoader) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const currentItem = navItems.find((item) => item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const currentTitle = currentItem?.label || 'Control Center';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
            <img src="/logos/logo-mark.png" alt="Meeting Automator" className="h-8 w-8 object-cover" />
          </div>
          <span className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Meeting <span className="text-brand-500">Automator</span> Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {['Workspace', 'Business', 'Content', 'Access', 'System'].map((group) => {
          const items = navItems.filter((item) => item.group === group);
          return (
            <div key={group} className="mb-5 last:mb-0">
              <div className="px-3 mb-2 text-[9px] font-black uppercase tracking-[.18em] text-zinc-400 dark:text-zinc-600">{group}</div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={cn('sidebar-link', isActive(item) && 'active')}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {isActive(item) && <ChevronRight className="w-3 h-3 ml-auto" />}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
        <Link href="/dashboard" className="sidebar-link">
          <Globe className="w-4 h-4" /> View Website
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
        {me && (
          <div className="px-3 pt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {me.fullName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{me.fullName}</p>
              <p className="text-[10px] text-zinc-400 truncate">{me.roleName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"><LogOut className="h-5 w-5" /></div>
            <h2 className="mt-4 font-display text-lg font-bold text-text-primary">Logout from admin?</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">Are you sure you want to end your Meeting Automator admin session?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setLogoutConfirmOpen(false)}>Cancel</button>
              <button className="inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700" onClick={confirmLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
      <div className="admin-shell flex h-screen overflow-hidden">
      <aside className="admin-sidebar hidden lg:flex w-64 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="admin-sidebar relative w-72 h-full z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="admin-content flex-1 flex flex-col overflow-hidden">
        <header className="admin-topbar h-[72px] flex items-center px-5 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:block min-w-0">
            <div className="admin-page-title truncate text-zinc-900 dark:text-zinc-100">{currentTitle}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
              <span className="admin-status-dot" /> Operations workspace <span className="text-zinc-300 dark:text-zinc-700">•</span> Protected
            </div>
          </div>

          <div className="flex-1" />

          <Link href="https://www.meetingautomator.com" target="_blank" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Globe className="w-4 h-4" /> Back to Website
          </Link>

          <ThemeToggle />

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-xs font-bold">
                {me?.fullName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline">
                {me?.fullName?.split(' ')[0] || 'Admin'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50">
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setUserMenuOpen(false)}>
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <button onClick={() => { setUserMenuOpen(false); handleLogout(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 w-full text-left">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {!isOnline && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-xs font-medium text-amber-700 dark:text-amber-400 text-center flex-shrink-0">
            You&apos;re offline. Your session is still active — changes will retry automatically once you&apos;re back online.
          </div>
        )}

        <main className="admin-main flex-1 overflow-y-auto px-4 pb-6 pt-5 md:px-7 md:pb-8 md:pt-6">
          <div className="mx-auto max-w-7xl">
            {isLoading && !me ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
      </div>
    </>
  );
}
