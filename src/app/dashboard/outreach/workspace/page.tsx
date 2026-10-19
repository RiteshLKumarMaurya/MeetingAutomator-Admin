'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Loader2, Plus, RefreshCw, Save, Send, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import Link from 'next/link';
import type { ApiResponse } from '@/types';

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'NOT_INTERESTED' | 'CONVERTED';
type SequenceStatus = 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'SKIPPED' | 'COMPLETED' | 'INTERESTED' | 'NOT_INTERESTED' | 'UNSUBSCRIBED' | 'DO_NOT_CONTACT' | 'MEETING_BOOKED';
type Channel = 'EMAIL' | 'CALL' | 'LINKEDIN' | 'INSTAGRAM' | 'WHATSAPP';
interface Lead { id: number; businessName: string | null; websiteUrl: string | null; internationalPhone: string | null; searchCity: string; status: LeadStatus; }
interface Sequence { id: number; leadId: number; stepNumber: number; channel: Channel; status: SequenceStatus; subject: string | null; draftContent: string | null; callScript: string | null; nextActionAt: string | null; approvedAt: string | null; sentAt: string | null; stoppedAt: string | null; stopReason: string | null; lastError: string | null; sendingEnabled: boolean; evidenceUrls: string | null; personalizationWarnings: string | null; createdAt: string; updatedAt: string | null; }

const STATUSES: SequenceStatus[] = ['DRAFT', 'APPROVED', 'SCHEDULED', 'FAILED', 'SENT', 'SKIPPED', 'COMPLETED', 'INTERESTED', 'NOT_INTERESTED', 'UNSUBSCRIBED', 'DO_NOT_CONTACT', 'MEETING_BOOKED'];
const CHANNELS: Channel[] = ['CALL', 'EMAIL', 'LINKEDIN', 'INSTAGRAM', 'WHATSAPP'];
const STOP_STATUSES = new Set<SequenceStatus>(['SKIPPED', 'COMPLETED', 'INTERESTED', 'NOT_INTERESTED', 'UNSUBSCRIBED', 'DO_NOT_CONTACT', 'MEETING_BOOKED']);
const labelStatus = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [items, setItems] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [stepNumber, setStepNumber] = useState('1');
  const [channel, setChannel] = useState<Channel>('CALL');
  const [subject, setSubject] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [callScript, setCallScript] = useState('');
  const [filter, setFilter] = useState<'ALL' | SequenceStatus>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [editing, setEditing] = useState<Record<number, { subject: string; draftContent: string; callScript: string }>>({});

  const leadById = useMemo(() => new Map<number, Lead>(leads.map((lead): [number, Lead] => [lead.id, lead])), [leads]);
  const stoppedLeadIds = useMemo(() => new Set(items.filter((item) => STOP_STATUSES.has(item.status)).map((item) => item.leadId)), [items]);
  const selectedLeadStopped = selectedLeadId !== '' && stoppedLeadIds.has(Number(selectedLeadId));
  const visibleItems = useMemo(() => filter === 'ALL' ? items : items.filter((item) => item.status === filter), [filter, items]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadResponse, sequenceResponse] = await Promise.all([
        apiClient.get<ApiResponse<{ content: Lead[] }>>('/api/v1/admin/leads/page?page=0&size=200&status=ALL'),
        apiClient.get<ApiResponse<Sequence[]>>('/api/v1/admin/outreach/sequences'),
      ]);
      const loadedLeads = leadResponse.data.data?.content ?? [];
      setLeads(loadedLeads);
      setItems(sequenceResponse.data.data ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load outreach workspace');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!selectedLeadId && leads.length) setSelectedLeadId(String(leads[0].id)); }, [selectedLeadId, leads]);

  const createDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeadId) { toast.error('Save or select a lead first'); return; }
    if (selectedLeadStopped) { toast.error('This lead is stopped or opted out. New outreach steps are blocked.'); return; }
    setSaving(true);
    try {
      const response = await apiClient.post<ApiResponse<Sequence>>('/api/v1/admin/outreach/sequences', {
        leadId: Number(selectedLeadId), stepNumber: Number(stepNumber), channel, subject, draftContent, callScript,
      });
      setItems((current) => [response.data.data, ...current]);
      setSubject(''); setDraftContent(''); setCallScript('');
      toast.success('Draft sequence created. Nothing was sent.');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not create draft'); }
    finally { setSaving(false); }
  };

  const generateCallScript = async () => {
    if (!selectedLeadId) { toast.error('Select a lead first'); return; }
    setGenerating(true);
    try {
      const response = await apiClient.get<ApiResponse<{ callScript: string; mode: string }>>(`/api/v1/admin/outreach/leads/${selectedLeadId}/call-script`);
      setCallScript(response.data.data.callScript);
      setChannel('CALL');
      toast.success('Personalized call-script draft generated');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not generate call script'); }
    finally { setGenerating(false); }
  };

  const generatePersonalizedDrafts = async () => {
    if (!selectedLeadId) { toast.error('Select a lead first'); return; }
    if (selectedLeadStopped) { toast.error('This lead is stopped or opted out. Draft generation is blocked.'); return; }
    setGenerating(true);
    try {
      const response = await apiClient.post<ApiResponse<Sequence[]>>(`/api/v1/admin/outreach/leads/${selectedLeadId}/generate-personalized-drafts`);
      const created = response.data.data ?? [];
      if (created.length === 0) toast('No new non-empty drafts were available.');
      else {
        setItems((current) => [...created, ...current]);
        toast.success(`${created.length} personalized draft(s) created for review. Nothing was sent.`);
      }
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not generate personalized drafts. Complete evidence-backed research first.'); }
    finally { setGenerating(false); }
  };

  const updateStatus = async (item: Sequence, status: SequenceStatus) => {
    setBusyId(item.id);
    try {
      const response = await apiClient.patch<ApiResponse<Sequence>>(`/api/v1/admin/outreach/sequences/${item.id}/status`, {
        status,
        stopReason: STOP_STATUSES.has(status) ? labelStatus(status) : null,
      });
      setItems((current) => current.map((entry) => entry.id === item.id ? response.data.data : entry));
      // The backend can propagate a stop outcome to every step for this lead; refresh all records.
      try {
        const refreshed = await apiClient.get<ApiResponse<Sequence[]>>('/api/v1/admin/outreach/sequences');
        setItems(refreshed.data.data ?? []);
      } catch {
        // Keep the confirmed status update visible even if the follow-up refresh fails.
      }
      toast.success(STOP_STATUSES.has(status) ? `Sequence stopped: ${labelStatus(status)}` : 'Status updated');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update status'); }
    finally { setBusyId(null); }
  };

  const saveEdit = async (item: Sequence) => {
    const values = editing[item.id];
    if (!values) return;
    setBusyId(item.id);
    try {
      const response = await apiClient.put<ApiResponse<Sequence>>(`/api/v1/admin/outreach/sequences/${item.id}/draft`, values);
      setItems((current) => current.map((entry) => entry.id === item.id ? response.data.data : entry));
      setEditing((current) => { const next = { ...current }; delete next[item.id]; return next; });
      toast.success('Draft saved. Sending remains disabled.');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not save draft'); }
    finally { setBusyId(null); }
  };

  const sendEmailNow = async (item: Sequence) => {
    if (item.channel !== 'EMAIL' || item.status !== 'APPROVED') { toast.error('Only approved email drafts can be sent'); return; }
    if (!window.confirm('Send this approved email now? Verify the recipient and claims first.')) return;
    setSendingId(item.id);
    try { const response = await apiClient.post<ApiResponse<{status:string}>>(`/api/v1/admin/outreach/email/sequences/${item.id}/send`); toast.success(response.data.message || 'Email send attempt processed'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Email was not sent; check readiness and delivery ledger'); }
    finally { setSendingId(null); }
  };

  const scheduleEmail = async (item: Sequence) => {
    if (item.channel !== 'EMAIL' || item.status !== 'APPROVED') { toast.error('Only approved email drafts can be scheduled'); return; }
    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now() + 60000) { toast.error('Choose a time at least one minute in the future'); return; }
    setSchedulingId(item.id);
    try { await apiClient.post(`/api/v1/admin/outreach/email/sequences/${item.id}/schedule`, { scheduledAt: new Date(scheduledAt).toISOString() }); toast.success('Approved email scheduled'); setScheduledAt(''); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not schedule email'); }
    finally { setSchedulingId(null); }
  };

  const beginEdit = (item: Sequence) => setEditing((current) => ({ ...current, [item.id]: { subject: item.subject ?? '', draftContent: item.draftContent ?? '', callScript: item.callScript ?? '' } }));

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Phase 5 · Controlled email automation</p><h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Outreach workspace</h1><div className="mt-3 flex flex-wrap gap-3"><Link href="/dashboard/outreach" className="text-sm font-semibold text-sky-700 underline dark:text-sky-300">Back to Outreach Center</Link><Link href="/dashboard/outreach/settings" className="text-sm font-semibold text-sky-700 underline dark:text-sky-300">Email delivery settings</Link><Link href="/dashboard/outreach/replies" className="text-sm font-semibold text-sky-700 underline dark:text-sky-300">Reply inbox</Link></div><p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">Create and track approved drafts, follow-up steps, and contact outcomes from one place.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"><RefreshCw className="h-4 w-4" /> Refresh</button>
    </div>

    <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" /><div><p className="font-semibold text-amber-900 dark:text-amber-200">Controlled delivery mode</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Email sending requires an approved draft, approved research, verified recipient, environment enablement, admin enablement and a disabled global pause. Other channels remain draft-only.</p></div></div></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: 'Total steps', value: items.length }, { label: 'Drafts', value: items.filter((x) => x.status === 'DRAFT').length }, { label: 'Approved', value: items.filter((x) => x.status === 'APPROVED').length }, { label: 'Stopped / closed', value: items.filter((x) => STOP_STATUSES.has(x.status)).length }].map((stat) => <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p><p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p></div>)}
    </div>

    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-600 dark:text-brand-300"><Plus className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Create an outreach step</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Drafts are saved to the backend; sending is not implemented.</p></div></div>
      {selectedLeadStopped && !loading && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">This lead has a stopped/closed outreach outcome. New steps are disabled to respect the stop status.</p>}
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading leads…</div> : leads.length === 0 ? <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">No leads found. Add a lead in Lead Generation before creating a sequence.</p> : <form onSubmit={createDraft} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Lead<select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">{leads.map((lead) => <option key={lead.id} value={lead.id}>#{lead.id} · {lead.businessName || 'Unnamed business'}{lead.searchCity ? ` — ${lead.searchCity}` : ''}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Step number<input type="number" min="1" max="20" value={stepNumber} onChange={(e) => setStepNumber(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950" required /></label><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Channel<select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950">{CHANNELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">Subject (optional)<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950" placeholder="For email drafts" /></label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">Message / follow-up notes<textarea value={draftContent} onChange={(e) => setDraftContent(e.target.value)} rows={4} maxLength={20000} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950" placeholder="Write or paste a personalized draft…" /></label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">Call script<textarea value={callScript} onChange={(e) => setCallScript(e.target.value)} rows={6} maxLength={20000} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-xs leading-5 dark:border-zinc-700 dark:bg-zinc-950" placeholder="Generate a call script or paste your own…" /></label>
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-2"><button type="button" onClick={() => void generateCallScript()} disabled={generating || selectedLeadStopped} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate call script</button><button type="button" onClick={() => void generatePersonalizedDrafts()} disabled={generating || selectedLeadStopped} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate researched drafts</button><button type="submit" disabled={saving || selectedLeadStopped} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save draft step</button></div>
      </form>}
    </section>

    <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Sequence records</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Email scheduler is enabled only when both gates are on and the global pause is off.</p></div><select value={filter} onChange={(e) => setFilter(e.target.value as 'ALL' | SequenceStatus)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"><option value="ALL">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{labelStatus(status)}</option>)}</select></div>
      {loading ? <div className="rounded-2xl border border-zinc-200 p-10 text-center text-zinc-500 dark:border-zinc-800"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : visibleItems.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700"><Clipboard className="mx-auto h-8 w-8 text-zinc-400" /><p className="mt-3 font-semibold text-zinc-800 dark:text-zinc-200">No sequence records yet</p><p className="mt-1 text-sm text-zinc-500">Create the first draft above to begin tracking outreach.</p></div> : <div className="space-y-4">{visibleItems.map((item) => { const lead = leadById.get(item.leadId); const edit = editing[item.id]; const closed = STOP_STATUSES.has(item.status) || item.status === 'SENT'; return <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Step {item.stepNumber}</span><span className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">{item.channel}</span><span className="rounded-lg bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-700 dark:text-sky-300">{labelStatus(item.status)}</span><span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" /> {item.status === 'SENT' ? 'Delivery recorded' : item.channel === 'EMAIL' ? 'Email gated by Phase 5 controls' : 'Draft only'}</span></div><h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">{lead?.businessName || `Lead #${item.leadId}`}</h3><p className="mt-1 text-xs text-zinc-500">Lead ID {item.leadId}{lead?.searchCity ? ` · ${lead.searchCity}` : ''}{lead?.websiteUrl ? ` · ${lead.websiteUrl}` : ''}</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label={`Update status for sequence ${item.id}`} disabled={busyId === item.id || closed} value={item.status} onChange={(e) => void updateStatus(item, e.target.value as SequenceStatus)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950">{STATUSES.filter((status) => status !== 'SENT').map((status) => <option key={status} value={status}>{labelStatus(status)}</option>)}</select>{edit ? <button onClick={() => void saveEdit(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save</button> : <button onClick={() => beginEdit(item)} disabled={closed} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200">Edit draft</button>}{item.channel === 'EMAIL' && item.status === 'APPROVED' && <button onClick={() => void sendEmailNow(item)} disabled={sendingId === item.id || busyId === item.id} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{sendingId === item.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>} Send now</button>}{item.channel === 'EMAIL' && item.status === 'APPROVED' && <div className="flex flex-wrap items-center gap-2"><input aria-label={`Schedule email sequence ${item.id}`} type="datetime-local" min={new Date(Date.now()+60000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="min-w-0 rounded-xl border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"/><button onClick={() => void scheduleEmail(item)} disabled={schedulingId === item.id || !scheduledAt} className="rounded-xl border border-violet-300 px-3 py-2 text-xs font-semibold text-violet-800 disabled:opacity-50 dark:border-violet-900 dark:text-violet-200">{schedulingId === item.id ? 'Scheduling…' : 'Schedule'}</button></div>}</div></div>
        {edit ? <div className="mt-4 grid gap-3"><label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject<input value={edit.subject} onChange={(e) => setEditing((current) => ({ ...current, [item.id]: { ...edit, subject: e.target.value } }))} maxLength={500} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Draft content<textarea value={edit.draftContent} onChange={(e) => setEditing((current) => ({ ...current, [item.id]: { ...edit, draftContent: e.target.value } }))} rows={4} maxLength={20000} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" /></label><label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Call script<textarea value={edit.callScript} onChange={(e) => setEditing((current) => ({ ...current, [item.id]: { ...edit, callScript: e.target.value } }))} rows={5} maxLength={20000} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950" /></label></div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{item.subject && <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subject</p><p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{item.subject}</p></div>}{item.draftContent && <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Draft</p><p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{item.draftContent}</p></div>}{item.callScript && <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70 md:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Call script</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">{item.callScript}</p></div>}</div>}
        {item.stopReason && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Stopped: {item.stopReason}</p>}{item.lastError && <p className="mt-3 text-sm text-red-600 dark:text-red-300">Note: {item.lastError}</p>}{item.personalizationWarnings && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><p className="font-semibold">Human review required</p><p className="mt-1">{item.personalizationWarnings}</p></div>}{item.evidenceUrls && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/20"><p className="font-semibold text-sky-900 dark:text-sky-200">Research evidence</p><ul className="mt-2 list-disc space-y-1 pl-5">{item.evidenceUrls.split(/\r?\n/).filter((url) => /^https?:\/\//i.test(url.trim())).map((url) => <li key={url}><a href={url.trim()} target="_blank" rel="noreferrer noopener" className="break-all text-sky-700 underline dark:text-sky-300">{url.trim()}</a></li>)}</ul></div>}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800"><span>Created {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</span>{item.approvedAt && <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approved {new Date(item.approvedAt).toLocaleString()}</span>}{item.stoppedAt && <span>Stopped {new Date(item.stoppedAt).toLocaleString()}</span>}</div>
      </article>})}</div>}
    </section>
    <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Personalized drafts reuse completed AI research and display its evidence URLs. Review every claim and contact permission before use. Scheduled email execution is guarded by the server and admin settings. Inbox/reply detection and social-platform integrations are not enabled in Phase 5. Verify contact permission and applicable laws before contacting a business.</p>
  </div>;
}
