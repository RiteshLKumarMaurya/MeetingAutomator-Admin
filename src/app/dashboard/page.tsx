'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, CalendarCheck, CalendarClock, CheckCircle2, Clock3,
  XCircle, Activity, Sparkles, Users, Settings, BarChart3
} from 'lucide-react';
import { useAdminBookingDashboard, useAdminBookings } from '@/hooks/useBooking';
import { useAdminProjects } from '@/hooks/useApi';
import { cn } from '@/lib/utils';

function StatCard({ title, value, icon: Icon, tone, href, delay }: {
  title: string; value: number | string; icon: React.ElementType; tone: string; href: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card-bg p-5 shadow-sm"
    >
      <div className={cn('absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-20', tone)} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{title}</p>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-text-primary">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/30">
          <Icon className="h-5 w-5 text-brand-500" />
        </div>
      </div>
      <Link href={href} className="relative mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500">
        View consultations <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    CONFIRMED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
    NO_SHOW: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide', styles[status] || styles.NO_SHOW)}>{statusLabel(status)}</span>;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
}

function formatScheduledAt(value?: string | null) {
  if (!value) return 'Time pending';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function ConsultationTrend({ bookings }: { bookings: Array<{ scheduledAt?: string | null }> }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: formatMonth(d), year: d.getUTCFullYear(), month: d.getUTCMonth(), count: 0 };
  });

  for (const booking of bookings) {
    if (!booking.scheduledAt) continue;
    const date = new Date(booking.scheduledAt);
    const bucket = months.find((m) => m.year === date.getUTCFullYear() && m.month === date.getUTCMonth());
    if (bucket) bucket.count += 1;
  }

  const max = Math.max(...months.map((m) => m.count), 1);
  const width = 760;
  const height = 240;
  const padX = 42;
  const padY = 28;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const points = months.map((m, i) => ({
    ...m,
    x: padX + (plotW * i) / (months.length - 1),
    y: height - padY - (m.count / max) * plotH,
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-zinc-50/60 p-3 dark:bg-zinc-950/30">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full" role="img" aria-label="Consultations scheduled over the last six months">
        {[0, 0.5, 1].map((ratio) => {
          const y = height - padY - ratio * plotH;
          return <line key={ratio} x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray="4 5" />;
        })}
        <polygon points={area} fill="currentColor" className="text-brand-500/5" />
        <polyline points={line} fill="none" stroke="currentColor" className="text-brand-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <g key={p.key}>
            <circle cx={p.x} cy={p.y} r="6" fill="currentColor" className="text-brand-500" />
            <circle cx={p.x} cy={p.y} r="3" fill="currentColor" className="text-white dark:text-zinc-950" />
            <text x={p.x} y={height - 7} textAnchor="middle" className="fill-text-muted text-[12px]">{p.label}</text>
            <text x={p.x} y={Math.max(16, p.y - 12)} textAnchor="middle" className="fill-text-primary text-[12px] font-bold">{p.count}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useAdminBookingDashboard();
  const { data: bookingsPage } = useAdminBookings({}, 0, 1000);
  const { data: projectsPage } = useAdminProjects(0);
  const bookings = bookingsPage?.content ?? [];

  const statusRows = [
    { label: 'Pending', value: dashboard?.pendingBookings ?? 0, icon: Clock3 },
    { label: 'Confirmed', value: dashboard?.confirmedBookings ?? 0, icon: CalendarCheck },
    { label: 'Completed', value: dashboard?.completedBookings ?? 0, icon: CheckCircle2 },
    { label: 'Cancelled', value: dashboard?.cancelledBookings ?? 0, icon: XCircle },
    { label: 'No-show', value: dashboard?.noShowBookings ?? 0, icon: Activity },
  ];
  const maxStatus = Math.max(...statusRows.map((row) => row.value), 1);

  return (
    <div className="space-y-7">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-500"><Sparkles className="h-3.5 w-3.5" /> Meeting Automator</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">Consultation Overview</h1>
            <p className="mt-1 text-sm text-text-secondary">Monitor consultation demand, status and upcoming meetings from one place.</p>
          </div>
          <Link href="/dashboard/bookings" className="btn-primary inline-flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Manage consultations</Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total consultations" value={isLoading ? '—' : dashboard?.totalBookings ?? 0} icon={CalendarCheck} tone="bg-brand-500" href="/dashboard/bookings" delay={0.05} />
        <StatCard title="Today" value={isLoading ? '—' : dashboard?.todayBookings ?? 0} icon={CalendarClock} tone="bg-blue-500" href="/dashboard/bookings" delay={0.1} />
        <StatCard title="Pending requests" value={isLoading ? '—' : dashboard?.pendingBookings ?? 0} icon={Clock3} tone="bg-amber-500" href="/dashboard/bookings" delay={0.15} />
        <StatCard title="Confirmed" value={isLoading ? '—' : dashboard?.confirmedBookings ?? 0} icon={CheckCircle2} tone="bg-emerald-500" href="/dashboard/bookings" delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-500" /><h2 className="font-display text-lg font-bold text-text-primary">Consultation volume</h2></div>
              <p className="mt-1 text-sm text-text-secondary">Consultations scheduled by month over the last six months.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">Live booking data</span>
          </div>
          <ConsultationTrend bookings={bookings} />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-brand-500" /><h2 className="font-display text-lg font-bold text-text-primary">Consultation status</h2></div>
          <p className="mt-1 text-sm text-text-secondary">Current distribution across the booking pipeline.</p>
          <div className="mt-6 space-y-4">
            {statusRows.map((row) => {
              const Icon = row.icon;
              return <div key={row.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium text-text-secondary"><Icon className="h-3.5 w-3.5" />{row.label}</span><span className="font-bold text-text-primary">{row.value}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(row.value / maxStatus) * 100}%` }} /></div>
              </div>;
            })}
          </div>
        </motion.section>
      </div>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-2xl border border-border bg-card-bg shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="font-display text-lg font-bold text-text-primary">Recent consultations</h2><p className="text-sm text-text-secondary">Latest consultation bookings received by Meeting Automator.</p></div>
          <Link href="/dashboard/bookings" className="btn-secondary inline-flex items-center gap-1.5 text-sm">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="divide-y divide-border">
          {bookings.slice(-5).reverse().map((booking) => (
            <Link key={booking.bookingId} href="/dashboard/bookings" className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400"><Users className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text-primary">{booking.name || 'Guest consultation'}</p><p className="truncate text-xs text-text-muted">{booking.companyName || booking.email}</p></div>
              <div className="text-right"><p className="text-xs font-semibold text-text-primary">{formatScheduledAt(booking.scheduledAt)}</p><div className="mt-1"><StatusPill status={booking.status} /></div></div>
            </Link>
          ))}
          {bookings.length === 0 && <div className="px-5 py-12 text-center text-sm text-text-muted">No consultations found yet.</div>}
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Link href="/dashboard/bookings/settings" className="group rounded-2xl border border-border bg-card-bg p-5 shadow-sm transition hover:-translate-y-1"><Settings className="h-5 w-5 text-brand-500" /><h3 className="mt-4 font-semibold text-text-primary">Consultation settings</h3><p className="mt-1 text-sm text-text-secondary">Control slots, duration, capacity and booking rules.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600">Open settings <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></span></Link>
        <Link href="/dashboard/users" className="group rounded-2xl border border-border bg-card-bg p-5 shadow-sm transition hover:-translate-y-1"><Users className="h-5 w-5 text-brand-500" /><h3 className="mt-4 font-semibold text-text-primary">Customers & users</h3><p className="mt-1 text-sm text-text-secondary">Review users and manage their account access.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600">Open users <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></span></Link>
        <Link href="/dashboard/projects" className="group rounded-2xl border border-border bg-card-bg p-5 shadow-sm transition hover:-translate-y-1"><BarChart3 className="h-5 w-5 text-brand-500" /><h3 className="mt-4 font-semibold text-text-primary">Projects</h3><p className="mt-1 text-sm text-text-secondary">{projectsPage?.totalElements ?? '—'} projects currently managed in the admin.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600">Open projects <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></span></Link>
      </div>
    </div>
  );
}
