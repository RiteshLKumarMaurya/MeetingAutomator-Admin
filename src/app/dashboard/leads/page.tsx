'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowUpRight, Building2, CheckCircle2, Clock3, ExternalLink, FileSpreadsheet,
  Globe2, Loader2, MapPinned, MapPin, Phone, RefreshCw, Search, ShieldCheck,
  Sparkles, Target, Users, Gauge, BellRing, Save, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'NOT_INTERESTED' | 'CONVERTED';
interface Lead {
  id: number;
  placeId: string;
  businessName: string | null;
  formattedAddress: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  internationalPhone: string | null;
  searchKeyword: string;
  searchCity: string;
  status: LeadStatus;
  createdAt: string | null;
  googleDataExpiresAt: string | null;
  googleDataExpired: boolean;
}
interface SearchResponse {
  resultsReturned: number;
  newlySaved: number;
  duplicatesSkipped: number;
  leads: Lead[];
  notice: string;
  nextPageToken?: string | null;
}
interface SearchProgress {
  target: number;
  discovered: number;
  saved: number;
  duplicates: number;
  batch: number;
  apiRequests: number;
  currentQuery: string;
}

interface UsageSettings {
  monthlyRequestLimit: number;
  dailyRequestLimit: number;
  freeMonthlyAllowance: number;
  monthlyPaidBudgetMinor: number;
  estimatedCostPer1000Minor: number;
  skuName: string;
  currencyCode: string;
  enabled: boolean;
  maxPagesPerSearch: number;
  warningPercent: number;
  updatedAt: string;
}
interface UsageDashboard {
  settings: UsageSettings;
  usage: {
    monthRequests: number;
    proSkuMonthRequests?: number;
    enterpriseSkuMonthRequests?: number;
    proSkuFreeCap?: number;
    enterpriseSkuFreeCap?: number;
    proSkuFreeRemainingEstimate?: number;
    enterpriseSkuFreeRemainingEstimate?: number;
    todayRequests: number;
    appEstimatedFreeRemaining: number;
    monthlyRequestsRemaining: number;
    dailyRequestsRemaining: number;
    estimatedCostMinor: number;
    budgetRemainingMinor: number;
    usagePercent: number;
    nextResetAt: string;
    warning: boolean;
  };
  recentEvents: Array<{ id: number; requestedAt: string; queryText: string; outcome: string; httpStatus: number; returnedResults: number; newLeads: number; duplicates: number; skuName: string; estimatedCostMinor: number }>;
  disclaimer: string;
  pricing?: { countryPricing: string; currency: string; sourceUrl: string; tiers: Array<{ sku: string; displayName: string; freeMonthlyCap: number; pricePer1000Usd: number }>; note: string };
}

const CURRENCY_OPTIONS = [
  { code: 'INR', label: 'INR — Indian Rupee' }, { code: 'USD', label: 'USD — US Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' }, { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' }, { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' }, { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'AED', label: 'AED — UAE Dirham' }, { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'ZAR', label: 'ZAR — South African Rand' }, { code: 'PHP', label: 'PHP — Philippine Peso' },
  { code: 'BRL', label: 'BRL — Brazilian Real' }, { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CHF', label: 'CHF — Swiss Franc' }, { code: 'MXN', label: 'MXN — Mexican Peso' },
] as const;

function currencyDigits(currencyCode: string): number {
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).resolvedOptions().maximumFractionDigits;
    return typeof digits === 'number' ? digits : 2;
  } catch {
    return 2;
  }
}
function toMinorUnits(amount: number, currencyCode: string) { return Math.round(amount * (10 ** currencyDigits(currencyCode))); }
function fromMinorUnits(amount: number, currencyCode: string) { return amount / (10 ** currencyDigits(currencyCode)); }
function formatMoney(minorAmount: number, currencyCode: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, currencyDisplay: 'narrowSymbol', minimumFractionDigits: currencyDigits(currencyCode), maximumFractionDigits: currencyDigits(currencyCode) }).format(fromMinorUnits(minorAmount, currencyCode)); }
  catch { return `${currencyCode} ${fromMinorUnits(minorAmount, currencyCode).toFixed(2)}`; }
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; classes: string }[] = [
  { value: 'NEW', label: 'New', classes: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  { value: 'CONTACTED', label: 'Contacted', classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { value: 'QUALIFIED', label: 'Qualified', classes: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  { value: 'NOT_INTERESTED', label: 'Not interested', classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300' },
  { value: 'CONVERTED', label: 'Converted', classes: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
];

function safeHost(url: string | null) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LeadGenerationPage() {
  const [keyword, setKeyword] = useState('visa immigration');
  const [city, setCity] = useState('Toronto');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(25);
  const [lastSearch, setLastSearch] = useState<SearchResponse | null>(null);
  const [resultLimit, setResultLimit] = useState(100);
  const [requestedFields, setRequestedFields] = useState<string[]>(['name', 'address', 'mapsUrl', 'websiteUrl']);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [usageDashboard, setUsageDashboard] = useState<UsageDashboard | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageSaving, setUsageSaving] = useState(false);
  const [usageForm, setUsageForm] = useState({ monthlyRequestLimit: 50, dailyRequestLimit: 10, freeMonthlyAllowance: 50, monthlyPaidBudgetAmount: 0, estimatedCostPer1000Amount: 0, currencyCode: 'INR', skuName: 'ENTERPRISE', enabled: false, maxPagesPerSearch: 3, warningPercent: 75 });

  const loadLeads = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<Lead[]>>('/api/v1/admin/leads');
      setLeads(response.data.data ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load saved leads');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadLeads(); }, [loadLeads]);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const response = await apiClient.get<ApiResponse<UsageDashboard>>('/api/v1/admin/leads/usage');
      const data = response.data.data;
      setUsageDashboard(data);
      setUsageForm({
        monthlyRequestLimit: data.settings.monthlyRequestLimit,
        dailyRequestLimit: data.settings.dailyRequestLimit,
        freeMonthlyAllowance: data.settings.freeMonthlyAllowance,
        monthlyPaidBudgetAmount: fromMinorUnits(data.settings.monthlyPaidBudgetMinor, data.settings.currencyCode || 'INR'),
        estimatedCostPer1000Amount: fromMinorUnits(data.settings.estimatedCostPer1000Minor, data.settings.currencyCode || 'INR'),
        currencyCode: data.settings.currencyCode || 'INR',
        skuName: data.settings.skuName,
        enabled: data.settings.enabled,
        maxPagesPerSearch: data.settings.maxPagesPerSearch ?? 3,
        warningPercent: data.settings.warningPercent,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load Usage & Billing settings');
    } finally { setUsageLoading(false); }
  }, []);

  useEffect(() => { void loadUsage(); }, [loadUsage]);

  const saveUsageSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (usageForm.dailyRequestLimit > usageForm.monthlyRequestLimit) {
      toast.error('Daily request limit cannot exceed monthly request limit');
      return;
    }
    setUsageSaving(true);
    try {
      const payload = {
        monthlyRequestLimit: usageForm.monthlyRequestLimit,
        dailyRequestLimit: usageForm.dailyRequestLimit,
        freeMonthlyAllowance: usageForm.freeMonthlyAllowance,
        monthlyPaidBudgetMinor: toMinorUnits(usageForm.monthlyPaidBudgetAmount, usageForm.currencyCode),
        estimatedCostPer1000Minor: toMinorUnits(usageForm.estimatedCostPer1000Amount, usageForm.currencyCode),
        skuName: usageForm.skuName,
        currencyCode: usageForm.currencyCode,
        enabled: usageForm.enabled,
        maxPagesPerSearch: usageForm.maxPagesPerSearch,
        warningPercent: usageForm.warningPercent,
      };
      const response = await apiClient.put<ApiResponse<UsageDashboard>>('/api/v1/admin/leads/usage/settings', payload);
      setUsageDashboard(response.data.data);
      toast.success('Usage & Billing settings saved');
      await loadUsage();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save usage settings');
    } finally { setUsageSaving(false); }
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      toast.error('Enter both a business keyword and city');
      return;
    }
    if (!window.confirm(`Search one keyword only. Google Places allows up to 60 results across at most 3 pages for this query (your Lead Settings page cap also applies). This may send up to 3 billable API requests, subject to your daily/monthly caps. Continue?`)) {
      return;
    }
    setSearching(true);
    setLastSearch(null);
    const terms = keyword.trim();
    let totalDiscovered = 0;
    let totalSaved = 0;
    let totalDuplicates = 0;
    let batch = 0;
    let apiRequests = 0;
    const allNew: Lead[] = [];
    const seenIds = new Set(leads.map((lead) => lead.placeId));
    setSearchProgress({ target: Math.min(resultLimit, 60), discovered: 0, saved: 0, duplicates: 0, batch: 0, apiRequests: 0, currentQuery: terms });
    try {
      // One manually selected keyword only. Google Text Search (New) supports up to
      // 20 results per page and up to 60 results total for a single query (max 3 pages).
      let pageToken: string | null | undefined = undefined;
      let pagesFetched = 0;
      const effectiveTarget = Math.min(resultLimit, 60);
      do {
        if (totalSaved >= effectiveTarget || pagesFetched >= (usageDashboard?.settings.maxPagesPerSearch ?? 3)) break;
        apiRequests += 1;
        setSearchProgress({ target: effectiveTarget, discovered: totalDiscovered, saved: totalSaved, duplicates: totalDuplicates, batch, apiRequests, currentQuery: terms });
        const response: { data: ApiResponse<SearchResponse> } = await apiClient.post<ApiResponse<SearchResponse>>('/api/v1/admin/leads/search', {
          keyword: terms, city: city.trim(), queryText: terms, pageToken: pageToken || null, fields: requestedFields,
        }, { timeout: 60000 });
        const result = response.data.data;
        batch += 1;
        pagesFetched += 1;
        totalDiscovered += result.resultsReturned ?? result.leads?.length ?? 0;
        totalDuplicates += result.duplicatesSkipped ?? 0;
        const newOnPage = (result.leads ?? []).filter((lead) => !seenIds.has(lead.placeId));
        newOnPage.forEach((lead) => seenIds.add(lead.placeId));
        allNew.push(...newOnPage);
        totalSaved += newOnPage.length;
        if (newOnPage.length) {
          setLeads((current) => {
            const ids = new Set(current.map((lead) => lead.placeId));
            return [...current, ...newOnPage.filter((lead) => !ids.has(lead.placeId))];
          });
        }
        setSearchProgress({ target: effectiveTarget, discovered: totalDiscovered, saved: totalSaved, duplicates: totalDuplicates, batch, apiRequests, currentQuery: terms });
        pageToken = result.nextPageToken;
      } while (pageToken && pagesFetched < (usageDashboard?.settings.maxPagesPerSearch ?? 3) && totalSaved < effectiveTarget);
      const result: SearchResponse = {
        resultsReturned: totalDiscovered, newlySaved: totalSaved, duplicatesSkipped: totalDuplicates,
        leads: allNew, notice: totalSaved >= Math.min(resultLimit, 60) ? 'Selected target reached.' : pagesFetched >= (usageDashboard?.settings.maxPagesPerSearch ?? 3) ? 'Google Places reached the 60-result maximum for one keyword. Use a different keyword manually to continue.' : 'Google returned no more pages for this keyword. No automatic keyword research was run.',
      };
      setLastSearch(result);
      if (totalSaved > 0) toast.success(`Found ${totalSaved} new lead${totalSaved === 1 ? '' : 's'} and saved them`);
      else toast('Search finished — no new leads found for these variations.');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.data?.message || 'Search interrupted. Results already saved are still available.';
      toast.error(message, { duration: 6500 });
      if (totalDiscovered > 0 || totalSaved > 0) {
        setLastSearch({ resultsReturned: totalDiscovered, newlySaved: totalSaved, duplicatesSkipped: totalDuplicates, leads: allNew, notice: `Search interrupted after ${apiRequests} Google request(s). ${totalSaved} new leads saved before interruption.` });
      }
    } finally {
      setSearching(false);
      setSearchProgress(null);
      await loadLeads(false);
    }
  };

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    const previous = leads;
    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
    try {
      await apiClient.patch<ApiResponse<Lead>>(`/api/v1/admin/leads/${lead.id}/status`, { status });
      toast.success('Lead status updated');
    } catch (error: any) {
      setLeads(previous);
      toast.error(error?.response?.data?.message || 'Could not update lead status');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await apiClient.get('/api/v1/admin/leads/export.csv', { responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `meetingautomator-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV export downloaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'CSV export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    setExportingExcel(true);
    try {
      const response = await apiClient.get('/api/v1/admin/leads/export.xlsx', { responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `meetingautomator-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel workbook downloaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Excel export failed');
    } finally {
      setExportingExcel(false);
    }
  };

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const searchText = `${lead.businessName ?? ''} ${lead.formattedAddress ?? ''} ${lead.websiteUrl ?? ''} ${lead.searchKeyword} ${lead.searchCity}`.toLowerCase();
    return (!query.trim() || searchText.includes(query.toLowerCase().trim())) && (statusFilter === 'ALL' || lead.status === statusFilter);
  }), [leads, query, statusFilter]);

  const totalTablePages = Math.max(1, Math.ceil(filteredLeads.length / tablePageSize));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const paginatedLeads = filteredLeads.slice((safeTablePage - 1) * tablePageSize, safeTablePage * tablePageSize);

  useEffect(() => { setTablePage(1); }, [query, statusFilter, tablePageSize]);
  useEffect(() => { if (tablePage > totalTablePages) setTablePage(totalTablePages); }, [tablePage, totalTablePages]);

  const freshCount = leads.filter((lead) => !lead.googleDataExpired).length;
  const qualifiedCount = leads.filter((lead) => lead.status === 'QUALIFIED').length;
  const contactedCount = leads.filter((lead) => lead.status === 'CONTACTED').length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" /> Sales workspace · Admin only
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">Lead Generation</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              Find relevant businesses from Google Places, save new leads without duplicates, and manage your outreach from the same admin panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadLeads()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => void exportCsv()} disabled={exporting || exportingExcel || leads.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />} Export CSV
            </button>
            <button onClick={() => void exportExcel()} disabled={exporting || exportingExcel || leads.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              {exportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Export Excel
            </button>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10"><Gauge className="h-6 w-6 text-cyan-200" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">Usage & Billing Guard</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${usageDashboard?.settings.enabled ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>{usageDashboard?.settings.enabled ? 'Guard active' : 'Searches paused'}</span></div><p className="mt-1 max-w-2xl text-sm text-slate-300">Track this app's requests, configure hard limits and stop before the configured cap.</p></div></div>
            <button type="button" onClick={() => void loadUsage()} disabled={usageLoading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${usageLoading ? 'animate-spin' : ''}`} /> Refresh usage</button>
          </div>
        </div>
        {usageLoading && !usageDashboard ? <div className="p-8 text-sm text-zinc-500">Loading usage ledger…</div> : usageDashboard && <div className="space-y-6 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UsageMetric title="Requests this month" value={`${usageDashboard.usage.monthRequests.toLocaleString()} / ${usageDashboard.settings.monthlyRequestLimit.toLocaleString()}`} detail={`${usageDashboard.usage.monthlyRequestsRemaining.toLocaleString()} app requests left`} percent={usageDashboard.usage.usagePercent} />
            <UsageMetric title="Requests today" value={`${usageDashboard.usage.todayRequests.toLocaleString()} / ${usageDashboard.settings.dailyRequestLimit.toLocaleString()}`} detail={`${usageDashboard.usage.dailyRequestsRemaining.toLocaleString()} requests left today`} percent={Math.min(100, usageDashboard.usage.todayRequests / Math.max(1, usageDashboard.settings.dailyRequestLimit) * 100)} />
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Configured free allowance estimate</p><p className="mt-2 text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">{usageDashboard.usage.appEstimatedFreeRemaining.toLocaleString()}</p><p className="mt-1 text-xs text-zinc-500">of {usageDashboard.settings.freeMonthlyAllowance.toLocaleString()} app-configured events left</p></div>
            <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Estimated app cost</p><p className="mt-2 text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">{formatMoney(usageDashboard.usage.estimatedCostMinor, usageDashboard.settings.currencyCode || 'INR')}</p><p className="mt-1 text-xs text-zinc-500">Budget remaining estimate: {formatMoney(usageDashboard.usage.budgetRemainingMinor, usageDashboard.settings.currencyCode || 'INR')}</p></div>
          </div>
          {usageDashboard.usage.warning && <div role="alert" className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4"><div className="flex items-start gap-3"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><p className="text-sm font-bold text-zinc-900 dark:text-white">Usage warning: {usageForm.warningPercent}% threshold reached</p><p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">The app is approaching its configured monthly request cap. New searches will be blocked when the hard cap is reached.</p></div></div></div>}
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-bold text-zinc-900 dark:text-white">Important: free allowance is an estimate, not Google account live data</p><p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">{usageDashboard.disclaimer} Google Cloud usage from other projects/API keys and delayed billing reports are not visible here. Configure a Google Cloud API quota separately for independent protection.</p></div></div></div>
          <form onSubmit={saveUsageSettings} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="font-bold text-zinc-900 dark:text-white">Guard settings</h3><p className="mt-1 text-xs text-zinc-500">Backend-enforced limits. Requests are counted before network calls, including failed attempts.</p></div><label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={usageForm.enabled} onChange={(e) => setUsageForm((s) => ({ ...s, enabled: e.target.checked }))} className="h-4 w-4 accent-emerald-600" /> Allow lead searches</label></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Budget currency</span><select value={usageForm.currencyCode} onChange={(e) => setUsageForm((s) => ({ ...s, currencyCode: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">{CURRENCY_OPTIONS.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}</select><span className="mt-1 block text-[11px] text-zinc-500">Amounts below are entered and enforced in this currency.</span></label>
              <UsageNumber label="Monthly request cap" value={usageForm.monthlyRequestLimit} min={1} max={100000} onChange={(v) => setUsageForm((s) => ({ ...s, monthlyRequestLimit: v }))} />
              <UsageNumber label="Daily request cap" value={usageForm.dailyRequestLimit} min={1} max={10000} onChange={(v) => setUsageForm((s) => ({ ...s, dailyRequestLimit: v }))} />
              <UsageNumber label="Max pages per keyword search (Google max 3)" value={usageForm.maxPagesPerSearch} min={1} max={3} onChange={(v) => setUsageForm((s) => ({ ...s, maxPagesPerSearch: Math.min(3, Math.max(1, v)) }))} />
              <UsageNumber label="App free allowance estimate" value={usageForm.freeMonthlyAllowance} min={0} max={1000000} onChange={(v) => setUsageForm((s) => ({ ...s, freeMonthlyAllowance: v }))} />
              <UsageNumber label={`Paid budget (${usageForm.currencyCode} / month)`} value={usageForm.monthlyPaidBudgetAmount} min={0} max={1000000} onChange={(v) => setUsageForm((s) => ({ ...s, monthlyPaidBudgetAmount: v }))} />
              <UsageNumber label={`Estimated price per 1,000 requests (${usageForm.currencyCode})`} value={usageForm.estimatedCostPer1000Amount} min={0} max={1000000} onChange={(v) => setUsageForm((s) => ({ ...s, estimatedCostPer1000Amount: v }))} />
              <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">SKU estimate</span><select value={usageForm.skuName} onChange={(e) => setUsageForm((s) => ({ ...s, skuName: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"><option value="ENTERPRISE">Text Search Enterprise</option><option value="PRO">Text Search Pro</option><option value="OTHER">Other / unknown</option></select></label>
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"><span>Warn at</span><select value={usageForm.warningPercent} onChange={(e) => setUsageForm((s) => ({ ...s, warningPercent: Number(e.target.value) }))} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"><option value={50}>50%</option><option value={75}>75%</option><option value={90}>90%</option><option value={95}>95%</option></select><BellRing className="h-4 w-4" /></label><button type="submit" disabled={usageSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950">{usageSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{usageSaving ? 'Saving…' : 'Save guard settings'}</button></div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">For a zero paid budget, leave the budget at zero in the selected currency and use a conservative request cap. This guard only sees requests made through this MeetingAutomator backend; it cannot guarantee Google account-wide ₹0 charges.</p>
          </form>
          <div><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-zinc-900 dark:text-white">Recent request ledger</h3><span className="text-xs text-zinc-500">Latest 50 attempts</span></div><div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Query</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Returned</th><th className="px-4 py-3">New</th><th className="px-4 py-3">Duplicates</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{usageDashboard.recentEvents.length ? usageDashboard.recentEvents.map((event) => <tr key={event.id}><td className="whitespace-nowrap px-4 py-3 text-zinc-500">{new Date(event.requestedAt).toLocaleString()}</td><td className="max-w-[260px] truncate px-4 py-3 text-zinc-800 dark:text-zinc-200">{event.queryText}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ${event.outcome === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-700' : event.outcome === 'FAILED' ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-700'}`}>{event.outcome}</span></td><td className="px-4 py-3 tabular-nums">{event.returnedResults}</td><td className="px-4 py-3 tabular-nums">{event.newLeads}</td><td className="px-4 py-3 tabular-nums">{event.duplicates}</td></tr>) : <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No requests recorded this session/month yet.</td></tr>}</tbody></table></div></div>
        </div>}
      </section>

      <form onSubmit={handleSearch} className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Target className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Discover businesses</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose one keyword and target. All available pages for that keyword are fetched automatically (up to 60 Google results); no automatic keyword research or keyword expansion.</p>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Business keyword</span>
            <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={300} placeholder="e.g. visa immigration" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">City / location</span>
            <div className="relative"><MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={200} placeholder="e.g. Toronto, Canada" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Target leads</span>
            <select value={resultLimit} onChange={(event) => setResultLimit(Number(event.target.value))} disabled={searching} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
              {[20, 40, 60, 100, 250, 500, 1000].map((count) => <option key={count} value={count}>{count.toLocaleString()} leads{count > 60 ? ' (Google single-query max: 60)' : ''}</option>)}
            </select>
          </label>
          <div className="col-span-1 min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:col-span-2 xl:col-span-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Fields to request from Google</h3>
            <p className="mt-1 text-xs text-zinc-500">Choose only the data you need. Website/phone fields can trigger Enterprise pricing; Place ID is always requested for deduplication.</p></div><span className="mt-2 inline-flex w-fit shrink-0 items-center rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{requestedFields.includes('websiteUrl') || requestedFields.includes('phone') ? 'Enterprise tier' : 'Pro tier'}</span></div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[["name","Business name — Pro"],["address","Business address — Pro"],["mapsUrl","Google Maps URL — Pro"],["websiteUrl","Website URL — Enterprise"],["phone","Phone number — Enterprise"]].map(([value,label]) => <label key={value} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={requestedFields.includes(value)} disabled={searching} onChange={(e) => setRequestedFields((old) => e.target.checked ? [...old,value] : old.filter((v) => v !== value))} className="h-4 w-4 rounded accent-brand-600" />{label}</label>)}
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"><strong>Estimated tier:</strong> {requestedFields.includes('websiteUrl') || requestedFields.includes('phone') ? 'Text Search Enterprise (India eligible accounts: 7,000 free events/month; then $10.50 per 1,000)' : 'Text Search Pro (India eligible accounts: 35,000 free events/month; then $9.60 per 1,000)'}.<br/>App-recorded this month for selected tier: {(requestedFields.includes('websiteUrl') || requestedFields.includes('phone') ? usageDashboard?.usage.enterpriseSkuMonthRequests : usageDashboard?.usage.proSkuMonthRequests) ?? 0} requests. Estimated remaining free tier: {(requestedFields.includes('websiteUrl') || requestedFields.includes('phone') ? usageDashboard?.usage.enterpriseSkuFreeRemainingEstimate : usageDashboard?.usage.proSkuFreeRemainingEstimate) ?? 'load usage'}. This is only requests logged by this app; other projects/keys and delayed billing are not included.<br/>A business without a website is still saved and counted. The website field remains empty.<br/><a className="font-semibold text-brand-600 underline" href="https://developers.google.com/maps/billing-and-pricing/pricing-india" target="_blank" rel="noreferrer">Verify official India pricing</a>. These are published list rates, not live billing data; eligibility and taxes may vary.</div>
          </div>
          <button type="submit" disabled={searching} className="col-span-1 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 sm:justify-self-end sm:w-auto xl:col-span-3">
            {searching ? <><Sparkles className="h-4 w-4 animate-pulse" /> Discovering…</> : <><Search className="h-4 w-4" /> Search & save</>}
          </button>
        </div>
        {searching && searchProgress && <div className="relative mt-5 overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-sky-950/10">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 animate-pulse rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 animate-pulse rounded-full bg-violet-500/20 blur-3xl [animation-delay:700ms]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-300/10"><Sparkles className="h-5 w-5 animate-pulse text-sky-200" /><span className="absolute inset-0 animate-ping rounded-2xl border border-sky-200/30" /></div><div><p className="font-semibold">Finding your next customers<span className="inline-flex w-6 justify-start"><span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:120ms]">.</span><span className="animate-bounce [animation-delay:240ms]">.</span></span></p><p className="mt-1 max-w-xl truncate text-xs text-slate-300">Now exploring: {searchProgress.currentQuery}</p></div></div>
            <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-xl font-bold tabular-nums">{searchProgress.saved}</p><p className="text-[10px] uppercase tracking-wider text-slate-300">New saved</p></div><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-xl font-bold tabular-nums">{searchProgress.duplicates}</p><p className="text-[10px] uppercase tracking-wider text-slate-300">Duplicates</p></div><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-xl font-bold tabular-nums">{searchProgress.batch}</p><p className="text-[10px] uppercase tracking-wider text-slate-300">Batches</p></div></div>
          </div>
          <div className="relative mt-5"><div className="mb-2 flex items-center justify-between text-xs text-slate-300"><span>New-lead target progress</span><span>{Math.min(100, Math.round((searchProgress.saved / searchProgress.target) * 100))}% · {Math.min(searchProgress.saved, searchProgress.target).toLocaleString()} / {searchProgress.target.toLocaleString()} saved</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 transition-all duration-700 ease-out" style={{ width: `${Math.max(3, Math.min(100, (searchProgress.saved / searchProgress.target) * 100))}%` }} /><div className="-mt-2 h-2 w-1/4 animate-pulse rounded-full bg-white/30 blur-sm" /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"><span>{searchProgress.discovered.toLocaleString()} Google results checked · {searchProgress.apiRequests} API requests attempted</span><span>Each successful batch is shown immediately. Targets are maximums, not guarantees.</span></div></div>
        </div>}
        {lastSearch && <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-bold text-zinc-900 dark:text-white">Search completed</p><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{lastSearch.resultsReturned} results checked · {lastSearch.newlySaved} new saved · {lastSearch.duplicatesSkipped} duplicates skipped. {lastSearch.notice}</p></div></div>
          <span className="text-xs text-zinc-500">Google Places data expires after 30 days</span>
        </div>}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total saved leads" value={leads.length} detail="Unique Place IDs" icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Details available" value={freshCount} detail="Within Google cache window" icon={<Building2 className="h-5 w-5" />} />
        <MetricCard label="Contacted" value={contactedCount} detail="Outreach started" icon={<Phone className="h-5 w-5" />} />
        <MetricCard label="Qualified" value={qualifiedCount} detail="Ready for next step" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-200/80 p-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="text-lg font-bold text-zinc-900 dark:text-white">Saved leads</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Kept in insertion order; update statuses as you work through outreach.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter leads…" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 sm:w-56 dark:border-zinc-700 dark:bg-zinc-950" /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | LeadStatus)} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="ALL">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="flex items-center justify-center gap-3 p-16 text-sm text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading saved leads…</div> : filteredLeads.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800"><MapPinned className="h-6 w-6" /></div><h3 className="mt-4 font-bold text-zinc-900 dark:text-white">{leads.length ? 'No matching leads' : 'Your lead workspace is ready'}</h3><p className="mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">{leads.length ? 'Try changing the search text or status filter.' : 'Run your first business search above. New leads will be saved here and checked against existing Place IDs.'}</p></div> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead className="bg-zinc-50/80 text-[11px] uppercase tracking-[.12em] text-zinc-500 dark:bg-zinc-950/60"><tr><th className="px-6 py-4 font-semibold">Business</th><th className="px-4 py-4 font-semibold">Website</th><th className="px-4 py-4 font-semibold">Search</th><th className="px-4 py-4 font-semibold">Status</th><th className="px-4 py-4 font-semibold">Data expiry</th><th className="px-6 py-4 text-right font-semibold">Links</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{paginatedLeads.map((lead) => {
            const status = STATUS_OPTIONS.find((item) => item.value === lead.status) ?? STATUS_OPTIONS[0];
            return <tr key={lead.id} className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"><td className="max-w-[360px] px-6 py-4"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Building2 className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{lead.businessName || 'Google Places details expired'}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{lead.formattedAddress || (lead.googleDataExpired ? 'Details cleared under retention policy' : 'Address not available')}</p>{lead.internationalPhone && <p className="mt-1 text-xs text-zinc-500">{lead.internationalPhone}</p>}</div></div></td><td className="px-4 py-4">{lead.websiteUrl ? <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-[180px] items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"><Globe2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{safeHost(lead.websiteUrl)}</span><ArrowUpRight className="h-3 w-3 shrink-0" /></a> : <span className="text-xs text-zinc-400">Not available</span>}</td><td className="px-4 py-4"><p className="text-sm text-zinc-700 dark:text-zinc-300">{lead.searchKeyword}</p><p className="mt-1 text-xs text-zinc-500">{lead.searchCity}</p></td><td className="px-4 py-4"><select aria-label={`Status for ${lead.businessName ?? lead.placeId}`} value={lead.status} onChange={(event) => void updateStatus(lead, event.target.value as LeadStatus)} className={`max-w-[150px] rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none ring-1 ring-inset ring-current/10 ${status.classes}`}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 text-xs ${lead.googleDataExpired ? 'text-amber-600 dark:text-amber-300' : 'text-zinc-500 dark:text-zinc-400'}`}><Clock3 className="h-3.5 w-3.5" />{lead.googleDataExpired ? 'Expired' : formatDate(lead.googleDataExpiresAt)}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2">{lead.googleMapsUrl ? <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Open Google Maps" title="Open Google Maps" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"><MapPin className="h-4 w-4" /></a> : <span title="Google Maps URL expired" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-100 text-zinc-300 dark:border-zinc-800"><MapPin className="h-4 w-4" /></span>}{lead.websiteUrl && <a href={lead.websiteUrl} target="_blank" rel="noreferrer" aria-label="Open website" title="Open website" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"><ExternalLink className="h-4 w-4" /></a>}</div></td></tr>;
          })}</tbody></table></div>
          <div className="flex flex-col gap-4 border-t border-zinc-200/80 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filteredLeads.length === 0 ? 0 : (safeTablePage - 1) * tablePageSize + 1}–{Math.min(safeTablePage * tablePageSize, filteredLeads.length)} of {filteredLeads.length} matching leads ({leads.length} total saved) · oldest first</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Admin-only · API key stays on backend</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2">Rows per page
                <select value={tablePageSize} onChange={(event) => setTablePageSize(Number(event.target.value))} className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button type="button" onClick={() => setTablePage((page) => Math.max(1, page - 1))} disabled={safeTablePage <= 1} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Previous</button>
                <span className="min-w-[90px] text-center font-medium text-zinc-700 dark:text-zinc-200">Page {safeTablePage} of {totalTablePages}</span>
                <button type="button" onClick={() => setTablePage((page) => Math.min(totalTablePages, page + 1))} disabled={safeTablePage >= totalTablePages} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Next</button>
              </div>
            </div>
          </div>
        </>}
      </section>
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between"><span>Google Maps attribution: Google Maps · Place IDs are retained for duplicate detection; other Google Places details are cleared after 30 days.</span><a href="https://developers.google.com/maps/documentation/places/web-service/policies" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-300">Places API policies <ExternalLink className="h-3 w-3" /></a></div>
    </div>
  );
}

function UsageMetric({ title, value, detail, percent }: { title: string; value: string; detail: string; percent: number }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p><p className="mt-2 text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">{value}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={`h-full rounded-full transition-all duration-500 ${safePercent >= 90 ? 'bg-rose-500' : safePercent >= 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'}`} style={{ width: `${safePercent}%` }} /></div><p className="mt-2 text-xs text-zinc-500">{detail}</p></div>;
}
function UsageNumber({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span><input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950" /></label>;
}

function MetricCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">{value.toLocaleString()}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">{icon}</div></div><p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p></div>;
}
