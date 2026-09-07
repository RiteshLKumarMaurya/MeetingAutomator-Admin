'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useAdminApproveBooking,
  useAdminBookingDashboard,
  useAdminBookingDetail,
  useAdminBookings,
  useAdminCancelBooking,
  useAdminCompleteBooking,
  useAdminDeleteBooking,
  useAdminNoShowBooking,
  useAdminRescheduleBooking,
  useAvailableConsultationSlots,
  useConsultationSettings,
} from '@/hooks/useBooking';
import type {
  AdminBookingFilterRequest,
  BookingActionRequest,
  BookingDashboardResponse,
  BookingDetailsResponse,
  BookingStatus,
  ConsultationBookingSummaryResponse,
  LeadSource,
  AvailableSlotResponse,
} from '@/types';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  BookingStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/50',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/25 dark:text-blue-300 dark:border-blue-900/50',
    dot: 'bg-blue-500',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-900/50',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/25 dark:text-red-300 dark:border-red-900/50',
    dot: 'bg-red-500',
  },
  NO_SHOW: {
    label: 'No-show',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    dot: 'bg-zinc-500',
  },
};

const LEAD_SOURCES: Array<{ value: LeadSource; label: string }> = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'OTHER', label: 'Other' },
];

const STAT_CARDS = [
  { key: 'totalBookings', label: 'Total bookings', icon: CalendarDays, tone: 'from-brand-600 to-violet-600' },
  { key: 'todayBookings', label: 'Today', icon: Activity, tone: 'from-sky-500 to-blue-600' },
  { key: 'pendingBookings', label: 'Needs approval', icon: Clock3, tone: 'from-amber-500 to-orange-600' },
  { key: 'confirmedBookings', label: 'Confirmed', icon: CheckCircle2, tone: 'from-blue-500 to-indigo-600' },
  { key: 'completedBookings', label: 'Completed', icon: Check, tone: 'from-emerald-500 to-teal-600' },
  { key: 'cancelledBookings', label: 'Cancelled', icon: XCircle, tone: 'from-rose-500 to-red-600' },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function initials(name?: string | null) {
  return (name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', meta.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: number | string;
  icon: typeof CalendarDays;
  tone: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        'admin-shimmer relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg',
        tone
      )}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
            Live
          </span>
        </div>
        <p className="mt-5 font-display text-3xl font-extrabold tracking-tight">{value}</p>
        <p className="mt-1 text-xs font-semibold text-white/75">{label}</p>
      </div>
    </motion.div>
  );
}

function BookingHero({
  dashboard,
  onRefresh,
  refreshing,
}: {
  dashboard?: BookingDashboardResponse;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="admin-shimmer relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-950 px-6 py-7 text-white shadow-xl dark:border-zinc-800 md:px-8 md:py-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,.30),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(14,165,233,.24),transparent_32%),radial-gradient(circle_at_75%_100%,rgba(139,92,246,.22),transparent_35%)]" />
      <div className="absolute right-6 top-6 hidden sm:block">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 shadow-lg backdrop-blur-xl">
         
          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.85)]" />
        </div>
      </div>
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-white/80 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          ONE-TO-ONE CONSULTATION CONTROL CENTER
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Turn every consultation into a well-managed opportunity.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Review requests, protect your calendar, confirm the right time,
          and keep the customer journey synchronized with Google Calendar and email.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-zinc-900 transition hover:bg-white/90"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh data
          </button>
          <a
            href="https://meetingautomator.com/consultation"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10"
          >
            View consultation page
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="/dashboard/bookings/settings"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Consultation settings
          </a>
        </div>
      </div>
      <div className="absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="admin-float pointer-events-none absolute bottom-[-46px] right-[-18px] hidden w-[330px] rotate-[-4deg] overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl lg:block">
        <img
          src="/images/consultation-hero.svg"
          alt=""
          className="h-auto w-full opacity-75"
        />
      </div>
    </motion.section>
  );
}

function DetailModal({
  bookingId,
  onClose,
  onAction,
}: {
  bookingId: string;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const { data, isLoading, isError } = useAdminBookingDetail(bookingId);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm md:p-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[92vh] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="relative overflow-hidden border-b border-zinc-200 bg-zinc-950 px-5 py-6 text-white dark:border-zinc-800 md:px-7">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                Consultation booking
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                {isLoading ? 'Loading booking…' : data?.customerName || 'Booking details'}
              </h2>
              {data?.status && (
                <div className="mt-3">
                  <StatusBadge status={data.status} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white/75 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 md:p-7">
          {isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              Could not load this booking. It may have been deleted or is temporarily unavailable.
            </div>
          ) : isLoading || !data ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Booking ID" value={data.bookingId} copyValue={() => copy(data.bookingId, 'Booking ID')} />
                <Info label="Customer" value={data.customerName} icon={<UserRound className="h-4 w-4" />} />
                <Info label="Email" value={data.email} href={`mailto:${data.email}`} icon={<Mail className="h-4 w-4" />} />
                <Info label="WhatsApp" value={data.whatsappNumber} href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, '')}`} icon={<Phone className="h-4 w-4" />} />
                <Info label="Company / store" value={data.companyName || '—'} />
                <Info label="Lead source" value={data.leadSource?.replace(/_/g, ' ') || '—'} />
                <Info label="Requested" value={formatDateTime(data.requestedAt)} icon={<Clock3 className="h-4 w-4" />} />
                <Info label="Scheduled" value={formatDateTime(data.scheduledAt)} icon={<CalendarDays className="h-4 w-4" />} />
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/35">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Contact customer</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <a
                    href={`mailto:${data.email}`}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-brand-700"
                  >
                    <Mail className="h-4 w-4" /> Email
                  </a>
                  <a
                    href={`tel:${data.whatsappNumber}`}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-brand-700"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                  <a
                    href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              </div>

              {(data.meetingLink || data.calendarLink || data.googleEventId) && (
                <div className="mt-5 rounded-2xl border border-default bg-zinc-50 p-5 dark:bg-zinc-800/50">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Calendar & meeting
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.meetingLink && (
                      <a
                        href={data.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700"
                      >
                        <Video className="h-4 w-4" /> Join Meet
                      </a>
                    )}
                    {data.calendarLink && (
                      <a
                        href={data.calendarLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <CalendarDays className="h-4 w-4" /> Open Calendar
                      </a>
                    )}
                    {data.googleEventId && (
                      <button
                        type="button"
                        onClick={() => copy(data.googleEventId!, 'Google event ID')}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <Copy className="h-4 w-4" /> Copy event ID
                      </button>
                    )}
                  </div>
                </div>
              )}

              {data.notes && (
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-amber-50/60 p-5 dark:border-zinc-700 dark:bg-amber-950/10">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {data.notes}
                  </p>
                </div>
              )}

              {data.cancelReason && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700 dark:text-red-400">
                    Cancellation reason
                  </p>
                  <p className="mt-2 text-sm leading-6 text-red-800 dark:text-red-300">
                    {data.cancelReason}
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-2 border-t border-zinc-200 pt-5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:grid-cols-2">
                <p>Created: {formatDateTime(data.createdAt)}</p>
                <p>Updated: {formatDateTime(data.updatedAt)}</p>
              </div>
            </>
          )}
        </div>

        {data && !isLoading && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/50 md:px-7">
            <div className="flex flex-wrap gap-2">
              {data.status === 'PENDING' && (
                <ActionButton onClick={() => onAction('approve')} tone="primary">
                  <Check className="h-4 w-4" /> Approve
                </ActionButton>
              )}
              {data.status === 'CONFIRMED' && (
                <>
                  <ActionButton onClick={() => onAction('reschedule')} tone="secondary">
                    <CalendarDays className="h-4 w-4" /> Reschedule
                  </ActionButton>
                  <ActionButton onClick={() => onAction('complete')} tone="success">
                    <CheckCircle2 className="h-4 w-4" /> Complete
                  </ActionButton>
                  <ActionButton onClick={() => onAction('no-show')} tone="muted">
                    <UserRound className="h-4 w-4" /> No-show
                  </ActionButton>
                  <ActionButton onClick={() => onAction('cancel')} tone="danger">
                    <XCircle className="h-4 w-4" /> Cancel
                  </ActionButton>
                </>
              )}
              {(data.status === 'PENDING' || data.status === 'CANCELLED' || data.status === 'COMPLETED' || data.status === 'NO_SHOW') && (
                <ActionButton onClick={() => onAction('delete')} tone="danger">
                  <Trash2 className="h-4 w-4" /> Delete
                </ActionButton>
              )}
            </div>
            <button type="button" onClick={onClose} className="btn-secondary !min-h-10">
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Info({
  label,
  value,
  href,
  copyValue,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  copyValue?: () => void;
  icon?: ReactNode;
}) {
  const content = (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-800/35">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <div className="mt-1.5 flex min-w-0 items-center gap-2">
        {icon && <span className="text-brand-500">{icon}</span>}
        <p className="min-w-0 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
        {copyValue && (
          <button type="button" onClick={copyValue} className="ml-auto flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-brand-600 dark:hover:bg-zinc-700">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
      {content}
    </a>
  ) : content;
}

function ActionButton({
  children,
  onClick,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  tone: 'primary' | 'secondary' | 'success' | 'muted' | 'danger';
}) {
  const classes = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'border border-zinc-200 bg-white text-zinc-800 hover:border-brand-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    muted: 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300',
  }[tone];

  return (
    <button type="button" onClick={onClick} className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition', classes)}>
      {children}
    </button>
  );
}

function buildCurrentBookingSlot(
  value?: string | null,
  durationMinutes = 30
): AvailableSlotResponse | null {
  if (!value) return null;

  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    start: value,
    end: end.toISOString(),
    label: `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`,
    available: true,
    remainingCapacity: 1,
  };
}

function ActionModal({
  type,
  booking,
  onClose,
}: {
  type: string;
  booking: BookingDetailsResponse;
  onClose: () => void;
}) {
  const bookingScheduledDate = booking.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleDateString('en-CA')
    : '';

  const [selectedDate, setSelectedDate] = useState(
  bookingScheduledDate || new Date().toLocaleDateString('en-CA')
);

// ============================================================
// CONSULTATION SETTINGS
// ============================================================

const consultationSettings = useConsultationSettings();
const settings = consultationSettings.data;

// ============================================================
// BOOKING DATE LIMITS
// ============================================================

const todayForBooking = useMemo(() => {
  const timezone = settings?.timezone || 'Asia/Kolkata';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}, [settings?.timezone]);

const maxBookingDate = useMemo(() => {
  if (!settings) return undefined;

  const d = new Date(`${todayForBooking}T00:00:00`);

  d.setDate(
    d.getDate() + settings.maximumAdvanceDays
  );

  return d.toLocaleDateString('en-CA');
}, [settings, todayForBooking]);

// ============================================================
// FORM STATE
// ============================================================

const [selectedSlot, setSelectedSlot] =
  useState<AvailableSlotResponse | null>(null);

const [meetingLink, setMeetingLink] =
  useState('');

const [notes, setNotes] =
  useState('');

const [cancelReason, setCancelReason] =
  useState('');

const [releaseSlot, setReleaseSlot] =
  useState(true);
  
  const currentBookingSlot = useMemo(() => {
    if (!booking.scheduledAt) return null;
    const start = new Date(booking.scheduledAt);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      return null;
    }
    return buildCurrentBookingSlot(
      booking.scheduledAt,
      settings?.slotDurationMinutes ?? 30
    );
  }, [booking.scheduledAt, settings?.slotDurationMinutes]);

  const availability = useAvailableConsultationSlots(
    type === 'approve' || type === 'reschedule' ? selectedDate : ''
  );

  useEffect(() => {
    if (currentBookingSlot && bookingScheduledDate === selectedDate) {
      setSelectedSlot(currentBookingSlot);
    }
  }, [currentBookingSlot, bookingScheduledDate, selectedDate]);

  const approve = useAdminApproveBooking();
  const reschedule = useAdminRescheduleBooking();
  const cancel = useAdminCancelBooking();
  const complete = useAdminCompleteBooking();
  const noShow = useAdminNoShowBooking();
  const remove = useAdminDeleteBooking();

  const pending =
    approve.isPending ||
    reschedule.isPending ||
    cancel.isPending ||
    complete.isPending ||
    noShow.isPending ||
    remove.isPending;

  const slots = useMemo(() => {
    const liveSlots = (availability.data ?? []).filter(
      (slot) => slot.available && slot.remainingCapacity > 0
    );

    // Always keep the booking's existing slot visible when viewing its
    // original scheduled date. It can be full/unavailable to new guests,
    // but it is still the slot currently owned by this booking.
    if (!currentBookingSlot || selectedDate !== bookingScheduledDate) {
      return liveSlots;
    }

    const existing = (availability.data ?? []).find(
      (slot) => slot.start === currentBookingSlot.start
    );

    if (existing) {
      return [
        {
          ...existing,
          available: true,
          remainingCapacity: Math.max(existing.remainingCapacity, 1),
        },
        ...liveSlots.filter((slot) => slot.start !== currentBookingSlot.start),
      ];
    }

    return [currentBookingSlot, ...liveSlots];
  }, [
    availability.data,
    currentBookingSlot,
    selectedDate,
    bookingScheduledDate,
  ]);

  const title =
    type === 'approve' ? 'Approve consultation' :
    type === 'reschedule' ? 'Reschedule consultation' :
    type === 'cancel' ? 'Cancel consultation' :
    type === 'complete' ? 'Mark as completed' :
    type === 'no-show' ? 'Mark as no-show' :
    'Delete booking';

  function onDateChange(value: string) {
    setSelectedDate(value);

    // Returning to the booking's original date should automatically
    // re-select the slot already owned by this booking.
    if (value === bookingScheduledDate && currentBookingSlot) {
      setSelectedSlot(currentBookingSlot);
      return;
    }

    // A different date must be chosen from fresh live availability.
    setSelectedSlot(null);
  }

  async function submit() {
    try {
      if (type === 'approve') {
        if (!selectedSlot) {
          toast.error('Select an available consultation slot.');
          return;
        }

        await approve.mutateAsync({
          bookingId: booking.bookingId,
          data: {
            scheduledAt: selectedSlot.start,
            meetingLink: meetingLink.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        });
      } else if (type === 'reschedule') {
        if (!selectedSlot) {
          toast.error('Select an available consultation slot.');
          return;
        }

        await reschedule.mutateAsync({
          bookingId: booking.bookingId,
          data: {
            scheduledAt: selectedSlot.start,
            meetingLink: meetingLink.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        });
      } else if (type === 'cancel') {
        if (!cancelReason.trim()) {
          toast.error('Cancellation reason is required.');
          return;
        }
        await cancel.mutateAsync({
          bookingId: booking.bookingId,
          data: {
            cancelReason: cancelReason.trim(),
            notes: notes.trim() || undefined,
            releaseSlot,
          },
        });
      } else if (type === 'complete') {
        await complete.mutateAsync(booking.bookingId);
      } else if (type === 'no-show') {
        await noShow.mutateAsync(booking.bookingId);
      } else if (type === 'delete') {
        if (!window.confirm('Delete this booking? This is a soft delete in the backend.')) return;
        await remove.mutateAsync(booking.bookingId);
      }

      onClose();
    } catch {
      // Hooks surface backend errors.
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[92vh] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex-shrink-0 border-b border-zinc-200 px-6 py-6 dark:border-zinc-800 md:px-7">
          <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
              Admin action
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{booking.customerName} · {booking.bookingId}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 md:px-7">
        {type === 'delete' ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            This removes the booking from normal admin views. The backend performs a soft delete and revokes the management token.
          </div>
        ) : type === 'complete' || type === 'no-show' ? (
          <div className="mt-6 rounded-2xl border border-default bg-zinc-50 p-5 text-sm leading-6 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300">
            This is a terminal booking state. The backend will revoke the guest management token.
          </div>
        ) : type === 'approve' || type === 'reschedule' ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
              {settings && (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-brand-700/80 dark:text-brand-300/80">
                  <span className="rounded-full border border-brand-200 bg-white/60 px-2.5 py-1 dark:border-brand-900/60 dark:bg-zinc-900/40">
                    {settings.startTime}–{settings.endTime}
                  </span>
                  <span className="rounded-full border border-brand-200 bg-white/60 px-2.5 py-1 dark:border-brand-900/60 dark:bg-zinc-900/40">
                    {settings.slotDurationMinutes} min
                  </span>
                  <span className="rounded-full border border-brand-200 bg-white/60 px-2.5 py-1 dark:border-brand-900/60 dark:bg-zinc-900/40">
                    {settings.timezone}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <p className="text-xs font-bold text-brand-800 dark:text-brand-200">
                    Live availability
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-brand-700/75 dark:text-brand-300/75">
                    Choose a date and we will fetch the real available consultation slots from the booking service. No manual time entry.
                  </p>
                </div>
              </div>
            </div>

            <label className="block text-sm font-semibold">
              {type === 'approve' ? 'Consultation date *' : 'New consultation date *'}
              <input
                type="date"
                min={todayForBooking}
                max={maxBookingDate}
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="input-base mt-2 w-full"
                required
              />
              <span className="mt-1.5 block text-[11px] font-normal text-zinc-400">
                Live slots are fetched from the booking service. Your existing booking slot remains selectable even when it is already at capacity.
              </span>
            </label>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold">Available slots *</label>
                {availability.isFetching && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Refreshing
                  </span>
                )}
              </div>

              {availability.isError ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                  Could not load slots for this date. Try another date or refresh.
                </div>
              ) : availability.isLoading ? (
                <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-default bg-zinc-50 p-5 text-xs text-zinc-500 dark:bg-zinc-800/40">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Checking live availability…
                </div>
              ) : slots.length === 0 ? (
                <div className="mt-2 rounded-xl border border-default bg-zinc-50 p-4 text-xs leading-5 text-zinc-500 dark:bg-zinc-800/40">
                  {selectedDate === bookingScheduledDate && currentBookingSlot
                    ? 'Your existing booking slot is shown below. You can keep it or choose another date.'
                    : 'No available slots on this date. Pick another date.'}
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const isCurrentBookingSlot =
                      Boolean(currentBookingSlot) &&
                      slot.start === currentBookingSlot?.start;

                    const selected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        type="button"
                        key={slot.start}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left transition',
                          selected
                            ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                            : 'border-zinc-200 bg-zinc-50 hover:border-brand-400 hover:bg-brand-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-brand-950/20'
                        )}
                      >
                        <span className="block text-sm font-bold">{slot.label}</span>
                        <span className={cn(
                          'mt-1 block text-[10px]',
                          selected ? 'text-white/75' : 'text-zinc-400'
                        )}>
                          {isCurrentBookingSlot
                            ? 'Current booking · selected'
                            : `${slot.remainingCapacity} ${slot.remainingCapacity === 1 ? 'spot' : 'spots'} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="block text-sm font-semibold">
              Custom Meet link
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Optional — Google Calendar can generate it automatically"
                className="input-base mt-2 w-full"
                maxLength={500}
              />
            </label>

            <label className="block text-sm font-semibold">
              Internal admin notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-base mt-2 min-h-24 w-full resize-y"
                maxLength={1000}
                placeholder="Optional internal note"
              />
            </label>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <label className="block text-sm font-semibold">
              Cancellation reason *
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="input-base mt-2 min-h-28 w-full resize-y"
                maxLength={500}
                placeholder="Why is this consultation being cancelled?"
                required
              />
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <input
                type="checkbox"
                checked={releaseSlot}
                onChange={(e) => setReleaseSlot(e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span>
                <span className="block text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Release this time slot for new bookings
                </span>
                <span className="mt-1 block text-[11px] font-normal leading-5 text-emerald-800/75 dark:text-emerald-300/75">
                  Recommended. Uncheck only when you intentionally want this future time to remain blocked after cancellation.
                </span>
              </span>
            </label>

            <label className="block text-sm font-semibold">
              Internal admin notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-base mt-2 min-h-24 w-full resize-y"
                maxLength={1000}
                placeholder="Optional internal note"
              />
            </label>
          </div>
        )}

        </div>
        <div className="flex-shrink-0 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/60 md:px-7">
          <button type="button" onClick={onClose} className="btn-secondary">
            Keep as is
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={
              pending ||
              ((type === 'approve' || type === 'reschedule') && !selectedSlot) ||
              (type === 'cancel' && !cancelReason.trim())
            }
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition disabled:opacity-50',
              type === 'cancel' || type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
              type === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700' :
              type === 'no-show' ? 'bg-zinc-700 hover:bg-zinc-800' :
              'bg-brand-600 hover:bg-brand-700'
            )}
          >
            {pending && <RefreshCw className="h-4 w-4 animate-spin" />}
            {pending ? 'Working…' : title}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [filters, setFilters] = useState<AdminBookingFilterRequest>({});
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [showFilters, setShowFilters] = useState(true);
  const router = useRouter();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const openBooking = useCallback((bookingId: string, syncUrl = true) => {
    setAction(null);
    setSelectedBookingId(bookingId);
    if (syncUrl) {
      router.replace(`/dashboard/bookings?bookingId=${encodeURIComponent(bookingId)}`, { scroll: false });
    }
  }, [router]);

  const closeBooking = useCallback(() => {
    setAction(null);
    setSelectedBookingId(null);
    router.replace('/dashboard/bookings', { scroll: false });
  }, [router]);

  useEffect(() => {
    const bookingId = new URLSearchParams(window.location.search).get('bookingId');
    if (bookingId) {
      setSelectedBookingId(bookingId);
      setAction(null);
    }
  }, []);

  useEffect(() => {
    const locked = Boolean(selectedBookingId);
    const previous = document.body.style.overflow;
    if (locked) document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeBooking();
      }
    };
    if (locked) window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedBookingId, closeBooking]);

  const dashboard = useAdminBookingDashboard();
  const list = useAdminBookings(filters, page, size);

  const selectedDetail = useAdminBookingDetail(selectedBookingId);

  const totalPages = list.data?.totalPages ?? 0;
  const currentPage = list.data?.number ?? page;
  const bookings = list.data?.content ?? [];

  function updateFilter<K extends keyof AdminBookingFilterRequest>(
    key: K,
    value: AdminBookingFilterRequest[K]
  ) {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setPage(0);
    setFilters({});
  }

  function toggleStatus(status: BookingStatus) {
    const current = filters.statuses ?? [];
    updateFilter(
      'statuses',
      current.includes(status)
        ? current.filter((x) => x !== status)
        : [...current, status]
    );
  }

  function openAction(type: string) {
    if (selectedBookingId) setAction(type);
  }

  const refreshing = dashboard.isFetching || list.isFetching;

  return (
    <div className="space-y-6 pb-10">
      <AnimatePresence>
        {selectedBookingId && !action && (
          <DetailModal
            bookingId={selectedBookingId}
            onClose={closeBooking}
            onAction={openAction}
          />
        )}
        {selectedBookingId && action && selectedDetail.data && (
          <ActionModal
            type={action}
            booking={selectedDetail.data}
            onClose={() => {
              setAction(null);
              selectedDetail.refetch();
              list.refetch();
              dashboard.refetch();
            }}
          />
        )}
      </AnimatePresence>

      <BookingHero
        dashboard={dashboard.data}
        onRefresh={() => {
          dashboard.refetch();
          list.refetch();
          if (selectedBookingId) selectedDetail.refetch();
        }}
        refreshing={refreshing}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map((card, index) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={dashboard.isLoading ? '—' : dashboard.data?.[card.key] ?? 0}
            icon={card.icon}
            tone={card.tone}
            delay={0.04 + index * 0.04}
          />
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Consultation pipeline</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {list.data?.totalElements ?? 0} bookings match the current view
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="btn-secondary gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide filters' : 'Filters'}
            </button>
            <button
              type="button"
              onClick={() => {
                list.refetch();
                dashboard.refetch();
              }}
              className="btn-secondary gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-b border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/30"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-xs font-bold text-zinc-500">
                Search
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    className="input-base w-full pl-9"
                    placeholder="Booking ID, name, email, WhatsApp, store…"
                    value={filters.keyword ?? ''}
                    onChange={(e) => updateFilter('keyword', e.target.value || undefined)}
                  />
                </div>
              </label>

              <label className="block text-xs font-bold text-zinc-500">
                Lead source
                <select
                  className="input-base mt-2 w-full"
                  value={filters.leadSources?.[0] ?? ''}
                  onChange={(e) =>
                    updateFilter('leadSources', e.target.value ? [e.target.value as LeadSource] : undefined)
                  }
                >
                  <option value="">All sources</option>
                  {LEAD_SOURCES.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-zinc-500">
                From date
                <input
                  type="date"
                  className="input-base mt-2 w-full"
                  value={filters.fromDate ?? ''}
                  onChange={(e) => updateFilter('fromDate', e.target.value || undefined)}
                />
              </label>

              <label className="block text-xs font-bold text-zinc-500">
                To date
                <input
                  type="date"
                  className="input-base mt-2 w-full"
                  value={filters.toDate ?? ''}
                  onChange={(e) => updateFilter('toDate', e.target.value || undefined)}
                />
              </label>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold text-zinc-500">Status</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(STATUS_META) as BookingStatus[]).map((status) => {
                  const active = filters.statuses?.includes(status);
                  return (
                    <button
                      type="button"
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-[11px] font-bold transition',
                        active
                          ? STATUS_META[status].className
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
                      )}
                    >
                      {STATUS_META[status].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={clearFilters} className="text-xs font-bold text-brand-600 hover:text-brand-700">
                Clear all filters
              </button>
            </div>
          </motion.div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/30">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Scheduled</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Contact</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {list.isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-10 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                      <CalendarDays className="h-7 w-7" />
                    </div>
                    <p className="mt-4 font-display font-bold">No consultations found</p>
                    <p className="mt-1 text-sm text-zinc-500">Try clearing a filter or create a new booking from the public consultation page.</p>
                  </td>
                </tr>
              ) : (
                bookings.map((booking: ConsultationBookingSummaryResponse, index: number) => (
                  <motion.tr
                    key={booking.bookingId}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.12) }}
                    className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    onClick={() => openBooking(booking.bookingId)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[220px] items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-extrabold text-white shadow-sm">
                          {initials(booking.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{booking.name}</p>
                          <p className="truncate text-xs text-zinc-400">{booking.companyName || booking.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{formatDateTime(booking.scheduledAt)}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">{booking.bookingId}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={booking.status} /></td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{booking.email}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">{booking.whatsappNumber}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBooking(booking.bookingId);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-zinc-700"
                        title="View details"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 md:hidden">
          {list.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))
          ) : bookings.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-zinc-500">
              No consultations found.
            </div>
          ) : (
            bookings.map((booking) => (
              <button
                type="button"
                key={booking.bookingId}
                onClick={() => openBooking(booking.bookingId)}
                className="w-full p-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-extrabold text-white">
                    {initials(booking.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">{booking.name}</p>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">{booking.companyName || booking.email}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
                        {formatDateTime(booking.scheduledAt)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-zinc-400" />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/20">
            <p className="text-xs text-zinc-500">
              Page {currentPage + 1} of {totalPages} · {list.data?.totalElements ?? 0} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 disabled:opacity-40 dark:border-zinc-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 disabled:opacity-40 dark:border-zinc-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400">
        <Shield className="h-3.5 w-3.5" />
        Admin actions are protected by the backend ROLE_ADMIN authorization layer.
      </div>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return <span className={className}>🛡️</span>;
}
