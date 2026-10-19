'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Sparkles, Users, Settings2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

type ResearchRecord = {
  id: number;
  leadId: number;
  businessName?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  summary?: string | null;
  sourceUrls?: string | null;
  verifiedEmail?: string | null;
  contactConfidence?: string | null;
  emailSubject?: string | null;
  emailDraft?: string | null;
  linkedinDraft?: string | null;
  instagramDraft?: string | null;
  whatsappDraft?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
  researchedAt?: string | null;
  approvedForEmail?: boolean;
  emailSentAt?: string | null;
};
type ResearchDashboard = { pending: number; inProgress: number; completed: number; failed: number; records: ResearchRecord[]; automaticSendingEnabled: boolean; providerConfigured?: boolean; discoveryEnabled?: boolean; dailyLimit?: number; attemptsInLast24Hours?: number; page?: number; pageSize?: number; totalRecords?: number; totalPages?: number; hasNext?: boolean; hasPrevious?: boolean };

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600', IN_PROGRESS: 'bg-blue-500/10 text-blue-600',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600', FAILED: 'bg-red-500/10 text-red-600', SKIPPED: 'bg-gray-500/10 text-gray-600',
};

export default function AiLeadResearchPage() {
  const [data, setData] = useState<ResearchDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [batchSize, setBatchSize] = useState('20');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/admin/leads/research', { params: { page, size: pageSize } });
      setData(response.data?.data ?? response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load AI research queue');
    } finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  const queueLeads = async () => {
    setQueueing(true);
    try {
      const response = await apiClient.post('/api/v1/admin/leads/research/queue', { limit: Number(batchSize) });
      const result = response.data?.data ?? response.data;
      if ((result?.queuedCount ?? 0) < Number(batchSize)) toast(`${result?.note || `Only ${result?.queuedCount ?? 0} eligible leads were available.`}`, { duration: 7000 });
      else toast.success(`${result?.queuedCount ?? 0} lead(s) added to the research queue`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not queue leads');
    } finally { setQueueing(false); }
  };

  const processPending = async () => {
    setProcessing(true);
    try {
      const response = await apiClient.post('/api/v1/admin/leads/research/process', { limit: Number(batchSize) });
      const result = response.data?.data ?? response.data;
      if (!result?.providerConfigured) toast.error(result?.note || 'Research provider is not configured');
      else toast.success(`Processed ${result?.processed ?? 0} record(s); skipped ${result?.skipped ?? 0}; failed ${result?.failed ?? 0}`);
      if (result?.note) toast(result.note, { duration: 6000 });
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not process research queue');
    } finally { setProcessing(false); }
  };

  const retryFailed = async () => {
    setRetrying(true);
    try {
      const response = await apiClient.post('/api/v1/admin/leads/research/retry-failed', { limit: Number(batchSize) });
      const result = response.data?.data ?? response.data;
      toast.success(`${result?.requeued ?? 0} failed record(s) returned to the queue`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not retry failed records');
    } finally { setRetrying(false); }
  };

  const stats = [
    { label: 'Pending', value: data?.pending ?? 0, icon: Clock3, tone: 'text-amber-600' },
    { label: 'In progress', value: data?.inProgress ?? 0, icon: RefreshCw, tone: 'text-blue-600' },
    { label: 'Completed', value: data?.completed ?? 0, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: 'Failed', value: data?.failed ?? 0, icon: AlertTriangle, tone: 'text-red-600' },
  ];

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600"><Bot size={17} /> MEETINGAUTOMATOR INTELLIGENCE</div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">AI Lead Research</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">Queue eligible leads for research, keep results separate from contact status, and review drafts before any outreach.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/leads/research/settings" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary"><Settings2 size={16}/> Settings</Link>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh</button>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">{stat.label}</span><stat.icon size={18} className={stat.tone}/></div>
        <div className="mt-3 text-3xl font-bold text-text-primary">{stat.value}</div>
      </div>)}
    </section>

    <section className={`flex gap-3 rounded-2xl border p-4 ${data?.providerConfigured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <ShieldCheck className={`mt-0.5 shrink-0 ${data?.providerConfigured ? 'text-emerald-600' : 'text-amber-600'}`} size={22}/>
      <div><h2 className="font-semibold text-text-primary">{data?.providerConfigured ? 'External research provider configured' : 'External research is safely disabled'}</h2><p className="mt-1 text-sm leading-6 text-text-secondary">{data?.providerConfigured ? 'Research uses the configured search and AI providers. Check evidence URLs and verify contact details before using drafts. No messages are sent.' : 'Configure the OpenAI key and enable research in Research Settings. Until enabled, queue records are preserved and processing makes no external calls. Automatic sending remains disabled.'}</p><p className="mt-2 text-xs text-text-secondary">Rolling 24-hour attempt limit: {data?.dailyLimit ?? 15}; used: {data?.attemptsInLast24Hours ?? 0}. Scheduled discovery: {data?.discoveryEnabled ? 'enabled' : 'disabled'}. Limits are enforced by the backend.</p></div>
    </section>

    <section className="rounded-2xl border border-border bg-background p-4 md:p-5 space-y-4">
      <div><h2 className="font-semibold text-text-primary">Research actions</h2><p className="mt-1 text-sm text-text-secondary">Choose a batch size. Queueing only adds eligible leads; processing makes AI requests and is still limited by your daily attempt cap.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-text-secondary">Batch size</span>
        {[20, 50, 100, 200].map((size) => <button key={size} type="button" onClick={() => setBatchSize(String(size))} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${Number(batchSize) === size ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-border text-text-primary'}`}>{size}</button>)}
        <label className="flex items-center gap-2 text-sm text-text-secondary">Custom <input aria-label="Custom research batch size" type="number" min={1} max={200} value={batchSize} onChange={(event) => setBatchSize(event.target.value)} className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-text-primary" /></label>
      </div>
      <p className="text-xs text-text-secondary">Enter 1–200. If fewer eligible leads exist, the queue will add only those available and explain the count. Processing can run fewer than requested due to the rolling 24-hour AI limit ({data?.dailyLimit ?? 15} attempts).</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void queueLeads()} disabled={queueing || loading || !Number.isInteger(Number(batchSize)) || Number(batchSize) < 1 || Number(batchSize) > 200} className="inline-flex items-center gap-2 rounded-xl border border-indigo-600 px-4 py-2.5 text-sm font-semibold text-indigo-600 disabled:opacity-50"><Users size={16}/>{queueing ? 'Queueing…' : `Queue ${batchSize || '…'} leads`}</button>
        <button onClick={() => void processPending()} disabled={processing || loading || (data?.pending ?? 0) === 0 || !Number.isInteger(Number(batchSize)) || Number(batchSize) < 1 || Number(batchSize) > 200} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Sparkles size={16}/>{processing ? 'Processing…' : `Process up to ${batchSize || '…'}`}</button>
        <button onClick={() => void retryFailed()} disabled={retrying || loading || (data?.failed ?? 0) === 0 || !Number.isInteger(Number(batchSize)) || Number(batchSize) < 1 || Number(batchSize) > 200} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary disabled:opacity-50"><RefreshCw size={16}/>{retrying ? 'Retrying…' : `Retry up to ${batchSize || '…'} failed`}</button>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 md:px-5"><div><h2 className="font-semibold text-text-primary">Research queue</h2><p className="mt-1 text-xs text-text-secondary">Existing lead records are preserved; each lead can be queued only once.</p></div><div className="flex items-center gap-2 text-xs text-text-secondary"><Users size={15}/>{data?.records?.length ?? 0} recent records</div></div>
      {loading ? <div className="p-10 text-center text-sm text-text-secondary">Loading research queue…</div> : !data?.records?.length ? <div className="p-10 text-center"><Bot size={32} className="mx-auto text-text-secondary"/><p className="mt-3 font-medium text-text-primary">Your research queue is empty</p><p className="mt-1 text-sm text-text-secondary">Choose a batch size above to queue eligible NEW leads.</p></div> : <div className="divide-y divide-border">
        {data.records.map((record) => <article key={record.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between md:px-5">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-text-primary">{record.businessName || `Lead #${record.leadId}`}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status] || statusStyles.PENDING}`}>{record.status.replace('_', ' ')}</span>{record.approvedForEmail && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">Email approved</span>}</div>
          {record.city && <p className="mt-1 text-xs text-text-secondary">{record.city}</p>}{record.websiteUrl && <a href={record.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs text-indigo-600 underline">{record.websiteUrl}</a>}{record.summary && <p className="mt-2 max-w-3xl text-sm text-text-secondary">{record.summary}</p>}
          {record.sourceUrls && <div className="mt-2 space-y-1">{record.sourceUrls.split('\n').filter(Boolean).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block break-all text-xs text-indigo-600 underline">Evidence reference: {url}</a>)}</div>}
          {record.contactConfidence && <p className="mt-1 text-xs text-text-secondary">Contact confidence: {record.contactConfidence} (not independently verified)</p>}
          {record.errorMessage && <p className="mt-2 text-sm text-red-600">{record.errorMessage}</p>}
          <p className="mt-2 text-xs text-text-secondary">{record.researchedAt ? `Researched ${new Date(record.researchedAt).toLocaleString()}` : `Queued ${record.createdAt ? new Date(record.createdAt).toLocaleString() : ''}`}</p></div>
          {record.verifiedEmail && <div className="text-sm"><span className="text-xs text-text-secondary">Email found in public evidence (not mailbox-verified)</span><br/><a className="break-all text-indigo-600 underline" href={`mailto:${record.verifiedEmail}`}>{record.verifiedEmail}</a></div>}
        </article>)}
      </div>}
      <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary"><span>{data?.totalRecords ?? 0} research records</span><label className="flex items-center gap-2">Rows per page <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="rounded-lg border border-border bg-background px-2 py-1.5 text-text-primary"><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label><span>Page {Math.min(page + 1, Math.max(data?.totalPages ?? 1, 1))} of {Math.max(data?.totalPages ?? 1, 1)}</span></div>
        <div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={loading || page <= 0} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || !data?.hasNext} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-40">Next</button></div>
      </div>
    </section>
  </main>;
}
