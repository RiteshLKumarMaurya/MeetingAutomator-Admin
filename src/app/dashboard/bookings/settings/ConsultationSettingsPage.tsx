'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Check,
  Clock3,
  Globe2,
  Info,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  useAdminConsultationSettings,
  useUpdateAdminConsultationSettings,
} from '@/hooks/useBooking';
import type {
  ConsultationSettingsResponse,
  UpdateConsultationSettingsRequest,
} from '@/types';

const DAYS: ConsultationSettingsResponse['workingDays'] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABELS: Record<ConsultationSettingsResponse['workingDays'][number], string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

function toTimeInput(value?: string) {
  if (!value) return '09:00';
  return value.slice(0, 5);
}

function fromSettings(settings: ConsultationSettingsResponse): UpdateConsultationSettingsRequest {
  return {
    enabled: settings.enabled,
    startTime: toTimeInput(settings.startTime),
    endTime: toTimeInput(settings.endTime),
    slotDurationMinutes: settings.slotDurationMinutes,
    slotCapacity: settings.slotCapacity,
    bufferMinutes: settings.bufferMinutes,
    minimumAdvanceMinutes: settings.minimumAdvanceMinutes,
    maximumAdvanceDays: settings.maximumAdvanceDays,
    maxReschedulesPer24Hours: settings.maxReschedulesPer24Hours,
    timezone: settings.timezone,
    workingDays: [...settings.workingDays],
  };
}

function humanMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Supports same-day, overnight, and 24-hour availability windows. */
function getWorkingWindowMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end > start ? end - start : 24 * 60 - start + end;
}

export default function ConsultationSettingsPage() {
  const query = useAdminConsultationSettings();
  const mutation = useUpdateAdminConsultationSettings();

  const [form, setForm] = useState<UpdateConsultationSettingsRequest | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (query.data && !dirty) {
      setForm(fromSettings(query.data));
    }
  }, [query.data, dirty]);

  const validation = useMemo(() => {
    if (!form) return null;

    const errors: string[] = [];
    if (!form.startTime || !form.endTime) {
      errors.push('Start and end times are required.');
    }
    if (form.slotDurationMinutes < 5 || form.slotDurationMinutes > 240) {
      errors.push('Slot duration must be between 5 and 240 minutes.');
    }
    if (form.slotCapacity < 1 || form.slotCapacity > 100) {
      errors.push('Slot capacity must be between 1 and 100.');
    }
    if (form.bufferMinutes < 0 || form.bufferMinutes > 240) {
      errors.push('Buffer must be between 0 and 240 minutes.');
    }
    if (form.minimumAdvanceMinutes < 0 || form.minimumAdvanceMinutes > 10080) {
      errors.push('Minimum advance must be between 0 and 7 days.');
    }
    if (form.maximumAdvanceDays < 1 || form.maximumAdvanceDays > 365) {
      errors.push('Maximum advance must be between 1 and 365 days.');
    }
    if (form.maxReschedulesPer24Hours < 1 || form.maxReschedulesPer24Hours > 50) {
      errors.push('Reschedule limit must be between 1 and 50.');
    }
    if (!form.timezone.trim()) errors.push('Timezone is required.');
    if (!form.workingDays.length) errors.push('Select at least one working day.');

    if (form.startTime && form.endTime && form.slotDurationMinutes > 0) {
      const windowMinutes = getWorkingWindowMinutes(form.startTime, form.endTime);
      if (form.slotDurationMinutes > windowMinutes) {
        errors.push('Slot duration cannot be longer than the working window.');
      }
    }

    return errors;
  }, [form]);

  function update<K extends keyof UpdateConsultationSettingsRequest>(
    key: K,
    value: UpdateConsultationSettingsRequest[K]
  ) {
    setDirty(true);
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function toggleDay(day: ConsultationSettingsResponse['workingDays'][number]) {
    if (!form) return;
    const next = form.workingDays.includes(day)
      ? form.workingDays.filter((item) => item !== day)
      : [...form.workingDays, day];

    update('workingDays', DAYS.filter((item) => next.includes(item)));
  }

  async function save() {
    if (!form || validation?.length) return;
    await mutation.mutateAsync(form);
    setDirty(false);
  }

  function reset() {
    if (query.data) {
      setForm(fromSettings(query.data));
      setDirty(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-3xl border border-default bg-card p-8 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-4 font-display font-bold">Loading consultation settings</p>
          <p className="mt-1 text-sm text-secondary">Reading the live booking configuration.</p>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-red-200 bg-card p-8 text-center shadow-sm dark:border-red-900/50">
          <Info className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-4 font-display text-xl font-bold">Could not load settings</h1>
          <p className="mt-2 text-sm text-secondary">Refresh the page and try again.</p>
          <button type="button" onClick={() => query.refetch()} className="btn-primary mt-6">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-3xl border border-default bg-card p-8 text-center shadow-sm">
          <Info className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-4 font-display font-bold">No consultation settings found</p>
          <p className="mt-1 text-sm text-secondary">Refresh after the backend initializes the booking configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(20,184,166,.24),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,.28),transparent_34%),radial-gradient(circle_at_75%_100%,rgba(14,165,233,.18),transparent_38%)]" />
        <div className="relative max-w-3xl">
          <Link href="/dashboard/bookings" className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to consultations
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
            <CalendarClock className="h-3.5 w-3.5 text-emerald-300" />
            Consultation control center
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Configure how customers book your time.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            These settings drive the public booking page, guest rescheduling,
            admin approval, live slot generation and Google Calendar duration.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-3xl border border-default bg-card p-6 shadow-sm md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">Availability rules</h2>
              <p className="mt-1 text-sm text-secondary">One source of truth for every booking surface.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-default bg-surface px-3 py-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={Boolean(form.enabled)}
                onChange={(e) => update('enabled', e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              {form.enabled ? 'Booking live' : 'Booking paused'}
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-bold">Need 24/7 availability?</p><p className="mt-1 text-xs text-secondary">Set 00:00 → 00:00 and enable all seven days. The backend treats equal times as a full 24-hour window.</p></div>
            <button type="button" className="btn-secondary whitespace-nowrap" onClick={() => { update('startTime','00:00'); update('endTime','00:00'); update('workingDays',[...DAYS]); }}>Set 24/7</button>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="Start time" hint="First slot can begin here.">
              <input type="time" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} className="input w-full" />
            </Field>
            <Field label="End time" hint="If earlier than the start time, availability continues into the next day.">
              <input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} className="input w-full" />
            </Field>
            <Field label="Slot duration" hint="Also controls Google Calendar event length.">
              <input type="number" min={5} max={240} value={form.slotDurationMinutes} onChange={(e) => update('slotDurationMinutes', Number(e.target.value))} className="input w-full" />
            </Field>
            <Field label="Capacity per slot" hint="How many bookings can share one slot.">
              <input type="number" min={1} max={100} value={form.slotCapacity} onChange={(e) => update('slotCapacity', Number(e.target.value))} className="input w-full" />
            </Field>
            <Field label="Buffer between slots" hint="Extra breathing room after each session.">
              <input type="number" min={0} max={240} value={form.bufferMinutes} onChange={(e) => update('bufferMinutes', Number(e.target.value))} className="input w-full" />
            </Field>
            <Field label="Minimum advance" hint="How soon before a slot a customer may book.">
              <input type="number" min={0} max={10080} value={form.minimumAdvanceMinutes} onChange={(e) => update('minimumAdvanceMinutes', Number(e.target.value))} className="input w-full" />
              <p className="mt-1 text-[10px] text-muted">{humanMinutes(form.minimumAdvanceMinutes)}</p>
            </Field>
            <Field label="Maximum advance days" hint="How far into the future dates can be booked/rescheduled.">
              <input type="number" min={1} max={365} value={form.maximumAdvanceDays} onChange={(e) => update('maximumAdvanceDays', Number(e.target.value))} className="input w-full" />
            </Field>
            <Field label="Guest reschedules / 24h" hint="Rolling limit for actual guest time changes.">
              <input type="number" min={1} max={50} value={form.maxReschedulesPer24Hours} onChange={(e) => update('maxReschedulesPer24Hours', Number(e.target.value))} className="input w-full" />
            </Field>
          </div>

          <div className="mt-7">
            <p className="text-sm font-bold">Working days</p>
            <p className="mt-1 text-xs text-secondary">Only these dates can return live slots.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAYS.map((day) => {
                const active = form.workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={[
                      'flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition',
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-200'
                        : 'border-default bg-surface text-secondary hover:border-brand-300',
                    ].join(' ')}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${active ? 'border-brand-500 bg-brand-600 text-white' : 'border-default'}`}>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            <Field label="Business timezone" hint="Use an IANA timezone such as Asia/Kolkata or America/New_York.">
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className="input w-full pl-9" placeholder="Asia/Kolkata" />
              </div>
            </Field>
          </div>

          {validation?.length ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <p className="font-bold">Fix these before saving:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {validation.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-default pt-5">
            <button type="button" onClick={reset} disabled={!dirty || mutation.isPending} className="btn-secondary">
              Reset
            </button>
            <button type="button" onClick={save} disabled={!dirty || Boolean(validation?.length) || mutation.isPending} className="btn-primary gap-2">
              {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {mutation.isPending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-default bg-card p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Live preview</p>
            <h2 className="mt-2 font-display text-2xl font-bold">What customers will see</h2>

            <div className="mt-5 space-y-3">
              <PreviewRow icon={<Clock3 className="h-4 w-4" />} label="Daily window" value={`${form.startTime} – ${form.endTime}`} />
              <PreviewRow icon={<CalendarClock className="h-4 w-4" />} label="Session" value={`${form.slotDurationMinutes} minutes`} />
              <PreviewRow icon={<Users className="h-4 w-4" />} label="Capacity" value={`${form.slotCapacity} per slot`} />
              <PreviewRow icon={<ShieldCheck className="h-4 w-4" />} label="Guest changes" value={`${form.maxReschedulesPer24Hours} reschedules / 24h`} />
              <PreviewRow icon={<Globe2 className="h-4 w-4" />} label="Timezone" value={form.timezone} />
            </div>
          </div>

          <div className="rounded-3xl border border-brand-200 bg-brand-50/70 p-6 dark:border-brand-900/50 dark:bg-brand-950/20">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <p className="text-sm font-bold text-brand-900 dark:text-brand-200">The backend is still authoritative</p>
                <p className="mt-2 text-xs leading-5 text-brand-800/75 dark:text-brand-300/75">
                  The frontend uses these values to make the UX accurate, but the backend re-checks every requested slot,
                  booking window, working day, capacity and guest reschedule limit before accepting a change.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
      {hint && <span className="mt-1.5 block text-[10px] font-normal leading-4 text-muted">{hint}</span>}
    </label>
  );
}

function PreviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-default bg-surface p-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
