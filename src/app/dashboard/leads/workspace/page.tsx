'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine, ArrowUpRight, Building2, CheckCircle2, Clock3, ExternalLink, FileSpreadsheet, Settings2,
  Globe2, Loader2, MapPinned, MapPin, Phone, RefreshCw, Search, ShieldCheck,
  Sparkles, Target, Users, Gauge, BellRing, Save, AlertTriangle, Plus, Pencil, Trash2, X,
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
  rating: number | null;
  userRatingCount: number | null;
  searchKeyword: string;
  searchCity: string;
  status: LeadStatus;
  createdAt: string | null;
  googleDataExpiresAt: string | null;
  googleDataExpired: boolean;
  googleSourced?: boolean;
}
interface LeadManageForm {
  businessName: string;
  formattedAddress: string;
  websiteUrl: string;
  googleMapsUrl: string;
  internationalPhone: string;
  searchCity: string;
  searchKeyword: string;
  status: LeadStatus;
}
const EMPTY_LEAD_FORM: LeadManageForm = { businessName: '', formattedAddress: '', websiteUrl: '', googleMapsUrl: '', internationalPhone: '', searchCity: '', searchKeyword: 'Manual entry', status: 'NEW' };

interface SearchResponse {
  resultsReturned: number;
  newlySaved: number;
  duplicatesSkipped: number;
  leads: Lead[];
  notice: string;
  nextPageToken?: string | null;
}
interface SearchProgress {
  target: number | null;
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
  billingAccountId?: string | null;
  billingExportProjectId?: string | null;
  billingExportDatasetId?: string | null;
  billingExportTableId?: string | null;
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


function MetricCard({ label, value, detail, icon }: { label: string; value: number | string; detail: string; icon: import('react').ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function LeadGenerationPage() {
  const [keyword, setKeyword] = useState('visa immigration');
  const [city, setCity] = useState('Toronto');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const cancelSearchRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportScope, setExportScope] = useState<'selected' | 'page' | 'all'>('selected');
  const [exportFields, setExportFields] = useState<string[]>(['id', 'businessName', 'rating', 'userRatingCount', 'formattedAddress', 'websiteUrl', 'googleMapsUrl', 'internationalPhone', 'searchKeyword', 'searchCity', 'status']);
  const [leadEditorOpen, setLeadEditorOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadManageForm>(EMPTY_LEAD_FORM);
  const [savingLead, setSavingLead] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(25);
  const [lastSearch, setLastSearch] = useState<SearchResponse | null>(null);
  const [resultLimit, setResultLimit] = useState<number | 'ALL'>(100);
  const [advancedSearchSettingsOpen, setAdvancedSearchSettingsOpen] = useState(false);
  const [requestedFields, setRequestedFields] = useState<string[]>(['name', 'address', 'mapsUrl', 'websiteUrl', 'phone', 'rating', 'userRatingCount']);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [usageDashboard, setUsageDashboard] = useState<UsageDashboard | null>(null);

  const [totalLeadCount, setTotalLeadCount] = useState(0);
  const [totalTablePages, setTotalTablePages] = useState(1);
  const loadLeads = useCallback(async (showSpinner = true, requestedPage = tablePage, requestedSize = tablePageSize, requestedQuery = query, requestedStatus = statusFilter, requestedDirection = sortDirection) => {
    if (showSpinner) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(Math.max(0, requestedPage - 1)), size: String(requestedSize), query: requestedQuery, status: requestedStatus, direction: requestedDirection });
      const response = await apiClient.get<ApiResponse<{content: Lead[]; totalElements: number; totalPages: number}>>(`/api/v1/admin/leads/page?${params.toString()}`);
      const data = response.data.data;
      setLeads(data?.content ?? []);
      setTotalLeadCount(data?.totalElements ?? 0);
      setTotalTablePages(Math.max(1, data?.totalPages ?? 1));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load saved leads');
    } finally { if (showSpinner) setLoading(false); }
  }, [tablePage, tablePageSize, query, statusFilter, sortDirection]);

  const loadUsage = useCallback(async () => {
    try {
      const response = await apiClient.get<ApiResponse<UsageDashboard>>('/api/v1/admin/leads/usage');
      const data = response.data.data;
      setUsageDashboard(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load search usage estimates');
    }
  }, []);

  useEffect(() => { void loadUsage(); }, [loadUsage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void apiClient.get<ApiResponse<UsageDashboard>>('/api/v1/admin/leads/usage')
        .then((response) => setUsageDashboard(response.data.data))
        .catch(() => { /* retain last known usage while the backend is unavailable */ });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      toast.error('Enter both a business keyword and city');
      return;
    }
    const allAvailableMode = resultLimit === 'ALL';
    const requestedTarget = allAvailableMode ? null : Math.max(1, Math.min(1000, Number(resultLimit) || 100));
    const targetDescription = allAvailableMode ? 'all available results within the resolved city area' : `up to ${requestedTarget} unique leads`;
    if (!window.confirm(`Search for ${targetDescription} in ${city.trim()} using geographic coverage cells with ${requestedFields.length} selected fields (${requestedFields.join(", ")}). ${allAvailableMode ? 'This may continue until coverage is exhausted or a configured request/budget cap is reached.' : 'If the target is reached and more search coverage remains, you will be asked whether to continue or stop at the target.'} This may require multiple billable Google Places requests plus a city-boundary lookup. Your configured daily/monthly request and budget caps still apply. You can stop the search at any time. Continue?`)) return;

    cancelSearchRef.current = false;
    setSearching(true);
    setLastSearch(null);
    const terms = keyword.trim();
    let totalDiscovered = 0, totalSaved = 0, totalDuplicates = 0, batch = 0, apiRequests = 0;
    const allNew: Lead[] = [];
    const seenIds = new Set(leads.map((lead) => lead.placeId));
    const target = requestedTarget;
    let continueBeyondTarget = allAvailableMode;
    let stopAtTarget = false;
    setSearchProgress({ target, discovered: 0, saved: 0, duplicates: 0, batch: 0, apiRequests: 0, currentQuery: terms });
    try {
      const boundsResponse = await apiClient.get<ApiResponse<{lowLatitude:number;lowLongitude:number;highLatitude:number;highLongitude:number}>>(
        `/api/v1/admin/leads/search/bounds?city=${encodeURIComponent(city.trim())}`, { timeout: 30000 }
      );
      const bounds = boundsResponse.data.data;
      // Partition the geocoded viewport into small, overlapping-safe rectangles.
      // Every cell gets its own Google pagination sequence; database Place-ID uniqueness
      // and the in-memory set prevent overlap/repeated-page duplicates from being counted.
      const latStep = 0.12, lngStep = 0.12;
      const cells: Array<{lowLatitude:number;lowLongitude:number;highLatitude:number;highLongitude:number}> = [];
      for (let lat = bounds.lowLatitude; lat < bounds.highLatitude; lat += latStep) {
        for (let lng = bounds.lowLongitude; lng < bounds.highLongitude; lng += lngStep) {
          cells.push({
            lowLatitude: Math.max(-90, lat - 0.002),
            lowLongitude: Math.max(-180, lng - 0.002),
            highLatitude: Math.min(90, Math.min(bounds.highLatitude, lat + latStep + 0.002)),
            highLongitude: Math.min(180, Math.min(bounds.highLongitude, lng + lngStep + 0.002)),
          });
        }
      }
      const maxPagesPerCell = Math.max(1, Math.min(3, usageDashboard?.settings.maxPagesPerSearch ?? 3));
      for (let cellIndex = 0; cellIndex < cells.length && (continueBeyondTarget || target === null || totalSaved < target) && !stopAtTarget; cellIndex++) {
        if (cancelSearchRef.current) break;
        let pageToken: string | null | undefined = undefined;
        for (let page = 0; page < maxPagesPerCell && (continueBeyondTarget || target === null || totalSaved < target) && !stopAtTarget; page++) {
          if (cancelSearchRef.current) break;
          apiRequests += 1;
          setSearchProgress({ target, discovered: totalDiscovered, saved: totalSaved, duplicates: totalDuplicates, batch, apiRequests, currentQuery: `${terms} · area ${cellIndex + 1}/${cells.length}` });
          const remainingTarget = target === null ? 20 : Math.max(1, target - totalSaved);
          const pageSize = Math.min(20, remainingTarget);
          const response: { data: ApiResponse<SearchResponse> } = await apiClient.post<ApiResponse<SearchResponse>>('/api/v1/admin/leads/search', {
            keyword: terms, city: city.trim(), queryText: terms, pageToken: pageToken || null,
            pageSize, fields: requestedFields, locationRestriction: cells[cellIndex],
          }, { timeout: 60000 });
          const result = response.data.data;
          batch += 1;
          totalDiscovered += result.resultsReturned ?? result.leads?.length ?? 0;
          totalDuplicates += result.duplicatesSkipped ?? 0;
          const newOnPage = (result.leads ?? []).filter((lead) => !seenIds.has(lead.placeId));
          newOnPage.forEach((lead) => seenIds.add(lead.placeId));
          allNew.push(...newOnPage);
          totalSaved += newOnPage.length;
          if (newOnPage.length) setLeads((current) => {
            const ids = new Set(current.map((lead) => lead.placeId));
            return [...current, ...newOnPage.filter((lead) => !ids.has(lead.placeId))];
          });
          setSearchProgress({ target, discovered: totalDiscovered, saved: totalSaved, duplicates: totalDuplicates, batch, apiRequests, currentQuery: `${terms} · area ${cellIndex + 1}/${cells.length}` });
          pageToken = result.nextPageToken;
          const moreCoverageRemains = Boolean(pageToken) || cellIndex < cells.length - 1;
          if (!continueBeyondTarget && target !== null && totalSaved >= target && moreCoverageRemains) {
            const continueSearch = window.confirm(`Target reached: ${totalSaved} unique leads saved. More geographic areas or pages remain. Do you want to continue searching for the remaining leads? Choose Cancel to stop at ${target.toLocaleString()}.`);
            if (continueSearch) {
              continueBeyondTarget = true;
              setSearchProgress({ target: null, discovered: totalDiscovered, saved: totalSaved, duplicates: totalDuplicates, batch, apiRequests, currentQuery: `${terms} · continuing beyond target` });
            } else {
              stopAtTarget = true;
              break;
            }
          }
          if (!pageToken) break;
        }
      }
      const stopped = cancelSearchRef.current;
      setLastSearch({
        resultsReturned: totalDiscovered, newlySaved: totalSaved, duplicatesSkipped: totalDuplicates, leads: allNew,
        notice: stopped ? `Search stopped by you after ${apiRequests} request(s). ${totalSaved} unique leads were saved.` :
          stopAtTarget ? `Target reached: ${totalSaved} unique leads saved. You chose to stop; remaining coverage was not searched.` :
          target === null || continueBeyondTarget ? `Search coverage completed or a configured request/budget cap stopped further requests. Saved ${totalSaved} unique leads from ${cells.length} geographic cells. Google results are not guaranteed to include every business.` :
          totalSaved >= target ? `Target reached: ${totalSaved} unique leads saved.` :
          `Coverage finished or configured request/budget limits stopped further requests. Saved ${totalSaved} unique leads from ${cells.length} geographic cells. Google results are not guaranteed to include every business.`,
      });
      if (totalSaved > 0) toast.success(`${totalSaved} unique lead${totalSaved === 1 ? '' : 's'} saved`);
      else toast('Search finished — no new unique leads were found.');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.data?.message || 'Search interrupted. Results already saved are still available.';
      toast.error(message, { duration: 6500 });
      if (totalDiscovered > 0 || totalSaved > 0) setLastSearch({ resultsReturned: totalDiscovered, newlySaved: totalSaved, duplicatesSkipped: totalDuplicates, leads: allNew, notice: `Search interrupted after ${apiRequests} Google request(s). ${totalSaved} unique leads were saved before interruption.` });
    } finally {
      setSearching(false);
      setSearchProgress(null);
      await loadLeads(false);
      await loadUsage();
    }
  };

  const stopSearch = () => { cancelSearchRef.current = true; toast('Stopping after the current request finishes…'); };

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    const previous = leads;
    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
    try {
      await apiClient.patch<ApiResponse<Lead>>(`/api/v1/admin/leads/${lead.id}/status`, { status });
      toast.success('Lead status updated');
      await loadLeads(false);
    } catch (error: any) {
      setLeads(previous);
      toast.error(error?.response?.data?.message || 'Could not update lead status');
    }
  };

  const openCreateLead = () => { setEditingLead(null); setLeadForm(EMPTY_LEAD_FORM); setLeadEditorOpen(true); };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({ businessName: lead.businessName ?? '', formattedAddress: lead.formattedAddress ?? '', websiteUrl: lead.websiteUrl ?? '', googleMapsUrl: lead.googleMapsUrl ?? '', internationalPhone: lead.internationalPhone ?? '', searchCity: lead.searchCity ?? '', searchKeyword: lead.searchKeyword ?? '', status: lead.status });
    setLeadEditorOpen(true);
  };

  const saveLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadForm.businessName.trim() || !leadForm.searchCity.trim()) { toast.error('Business name and city are required'); return; }
    setSavingLead(true);
    const payload = { ...leadForm, businessName: leadForm.businessName.trim(), searchCity: leadForm.searchCity.trim(), searchKeyword: leadForm.searchKeyword.trim() || 'Manual entry' };
    try {
      if (editingLead) {
        await apiClient.put<ApiResponse<Lead>>(`/api/v1/admin/leads/${editingLead.id}`, payload);
        toast.success('Lead updated');
      } else {
        await apiClient.post<ApiResponse<Lead>>('/api/v1/admin/leads/manual', payload);
        toast.success('Manual lead added');
      }
      setLeadEditorOpen(false);
      await loadLeads(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save lead');
    } finally { setSavingLead(false); }
  };

  const deleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete ${lead.businessName || 'this lead'}? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/leads/${lead.id}`);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setSelectedLeadIds((current) => current.filter((id) => id !== lead.id));
      toast.success('Lead deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not delete lead');
    }
  };

  const openExportDialog = (format: 'csv' | 'xlsx') => {
    setExportFormat(format);
    setExportScope(selectedLeadIds.length ? 'selected' : 'page');
    setExportDialogOpen(true);
  };

  const exportData = async () => {
    if (exportFields.length === 0) { toast.error('Choose at least one field to export'); return; }
    const ids = exportScope === 'selected' ? selectedLeadIds : exportScope === 'page' ? paginatedLeads.map((lead) => lead.id) : [];
    if (exportScope === 'selected' && ids.length === 0) { toast.error('Select at least one lead first'); return; }
    if (ids.length > 0 && !window.confirm(`Export ${ids.length} selected lead(s) with ${exportFields.length} field(s)?`)) return;
    if (exportScope === 'all' && !window.confirm(`Export all ${totalLeadCount} saved lead(s) with ${exportFields.length} field(s)?`)) return;
    setExporting(true);
    setExportingExcel(exportFormat === 'xlsx');
    try {
      const params = new URLSearchParams();
      if (ids.length) params.set('ids', ids.join(','));
      params.set('fields', exportFields.join(','));
      const endpoint = exportFormat === 'csv' ? 'export.csv' : 'export.xlsx';
      const response = await apiClient.get(`/api/v1/admin/leads/${endpoint}?${params.toString()}`, { responseType: 'blob', timeout: 60000 });
      const mime = exportFormat === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const url = URL.createObjectURL(new Blob([response.data], { type: mime }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `meetingautomator-leads-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      toast.success(`${ids.length || totalLeadCount} lead(s) exported`);
      setExportDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Export ${exportFormat.toUpperCase()} failed`);
    } finally { setExporting(false); setExportingExcel(false); }
  };

  const toggleLeadSelection = (id: number) => setSelectedLeadIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectVisiblePage = () => setSelectedLeadIds((current) => Array.from(new Set([...current, ...paginatedLeads.map((lead) => lead.id)])));
  const selectFirstTwenty = () => setSelectedLeadIds((current) => Array.from(new Set([...current, ...paginatedLeads.slice(0, 20).map((lead) => lead.id)])));
  const clearSelection = () => setSelectedLeadIds([]);
  const deleteSelectedLeads = async () => {
    const ids = [...selectedLeadIds];
    if (!ids.length) { toast.error('Select at least one lead'); return; }
    if (!window.confirm(`Permanently delete ${ids.length} selected lead(s)? This cannot be undone.`)) return;
    let deleted = 0;
    for (const id of ids) {
      try { await apiClient.delete(`/api/v1/admin/leads/${id}`); deleted++; } catch { /* continue */ }
    }
    setSelectedLeadIds([]);
    await loadLeads(false);
    if (deleted === ids.length) toast.success(`${deleted} lead(s) deleted`);
    else toast.error(`${deleted} of ${ids.length} lead(s) deleted. Refresh and review remaining records.`);
  };

  const filteredLeads = leads;
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const paginatedLeads = leads;
  useEffect(() => {
    setTablePage(1);
  }, [query, statusFilter, tablePageSize]);
  useEffect(() => { void loadLeads(true, tablePage, tablePageSize, query, statusFilter); }, [tablePage, tablePageSize, query, statusFilter, sortDirection]);

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
            <Link href="/dashboard/leads" className="mt-3 inline-flex items-center text-sm font-semibold text-sky-700 underline dark:text-sky-300">Back to Lead Center</Link>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              Find relevant businesses from Google Places, save new leads without duplicates, and manage your outreach from the same admin panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/leads/settings" aria-label="Open Lead Settings" title="Lead Settings" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-brand-500 hover:bg-zinc-50 hover:text-brand-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <Settings2 className="h-4 w-4" />
            </Link>
            <button onClick={() => void loadLeads()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => openExportDialog('csv')} disabled={exporting || exportingExcel || leads.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />} Export CSV
            </button>
            <button onClick={() => openExportDialog('xlsx')} disabled={exporting || exportingExcel || leads.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              {exportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"><span className="text-zinc-600 dark:text-zinc-300">Need to change request caps or review Google Cloud billing?</span><Link href="/dashboard/leads/settings" className="shrink-0 font-semibold text-sky-700 underline dark:text-sky-300">Open usage settings</Link></div>

      <form onSubmit={handleSearch} className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Target className="h-5 w-5" /></div>
          <div className="flex w-full items-start justify-between gap-3">
            <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Discover businesses</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Search one keyword and location. Saved leads appear below.</p>
            </div>
            <button type="button" onClick={() => setAdvancedSearchSettingsOpen(v => !v)} aria-expanded={advancedSearchSettingsOpen} aria-label={advancedSearchSettingsOpen ? 'Hide search settings' : 'Show search settings'} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><Settings2 className="h-4 w-4"/>{advancedSearchSettingsOpen ? 'Hide settings' : 'Settings'}</button>
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
          {advancedSearchSettingsOpen && <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Target leads</span>
            <select value={resultLimit} onChange={(event) => setResultLimit(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))} disabled={searching} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
              {[20, 40, 60, 100, 250, 500, 1000].map((count) => <option key={count} value={count}>{count.toLocaleString()} unique leads (geographic coverage)</option>)}<option value="ALL">All available leads (until coverage or budget/request caps end)</option>
            </select>
          </label>}
          {advancedSearchSettingsOpen && <div className="col-span-1 min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:col-span-2 xl:col-span-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Fields to request from Google</h3>
            <p className="mt-1 text-xs text-zinc-500">All fields are selected by default. Website, phone, and rating fields can trigger Enterprise pricing; Place ID is always requested for deduplication.</p></div><span className="mt-2 inline-flex w-fit shrink-0 items-center rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{requestedFields.includes('websiteUrl') || requestedFields.includes('phone') || requestedFields.includes('rating') || requestedFields.includes('userRatingCount') ? 'Enterprise tier' : 'Pro tier'}</span></div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[["name","Business name — Pro"],["address","Business address — Pro"],["mapsUrl","Google Maps URL — Pro"],["websiteUrl","Website URL — Enterprise"],["phone","Phone number — Enterprise"],["rating","Average rating / 5 — Enterprise"],["userRatingCount","Number of ratings — Enterprise"]].map(([value,label]) => <label key={value} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={requestedFields.includes(value)} disabled={searching} onChange={(e) => setRequestedFields((old) => e.target.checked ? [...old,value] : old.filter((v) => v !== value))} className="h-4 w-4 rounded accent-brand-600" />{label}</label>)}
            </div>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"><strong>Estimated tier:</strong> {requestedFields.includes('websiteUrl') || requestedFields.includes('phone') || requestedFields.includes('rating') || requestedFields.includes('userRatingCount') ? 'Text Search Enterprise (India eligible accounts: 7,000 free events/month; then $10.50 per 1,000)' : 'Text Search Pro (India eligible accounts: 35,000 free events/month; then $9.60 per 1,000)'}.<br/>App-recorded this month for selected tier: {(requestedFields.includes('websiteUrl') || requestedFields.includes('phone') || requestedFields.includes('rating') || requestedFields.includes('userRatingCount') ? usageDashboard?.usage.enterpriseSkuMonthRequests : usageDashboard?.usage.proSkuMonthRequests) ?? 0} requests. Estimated remaining free tier: {(requestedFields.includes('websiteUrl') || requestedFields.includes('phone') || requestedFields.includes('rating') || requestedFields.includes('userRatingCount') ? usageDashboard?.usage.enterpriseSkuFreeRemainingEstimate : usageDashboard?.usage.proSkuFreeRemainingEstimate) ?? 'load usage'}. This is only requests logged by this app; other projects/keys and delayed billing are not included.<br/>A business without a website is still saved and counted. The website field remains empty.<br/><a className="font-semibold text-brand-600 underline" href="https://developers.google.com/maps/billing-and-pricing/pricing-india" target="_blank" rel="noreferrer">Verify official India pricing</a>. These are published list rates, not live billing data; eligibility and taxes may vary.</div>
          </div>}
          <button type="submit" disabled={searching} className="col-span-1 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 sm:justify-self-end sm:w-auto xl:col-span-3">
            {searching ? <><Sparkles className="h-4 w-4 animate-pulse" /> Discovering…</> : <><Search className="h-4 w-4" /> Search & save</>}
          </button>
        </div>
        {searching && searchProgress && <div className="relative mt-5 overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-xl shadow-sky-950/10">
          <div className="relative mb-3 flex justify-end"><button type="button" onClick={stopSearch} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10"><X className="h-4 w-4" /> Stop search</button></div>
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 animate-pulse rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 animate-pulse rounded-full bg-violet-500/20 blur-3xl [animation-delay:700ms]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-300/10"><Sparkles className="h-5 w-5 animate-pulse text-sky-200" /><span className="absolute inset-0 animate-ping rounded-2xl border border-sky-200/30" /></div><div><p className="font-semibold">Finding your next customers<span className="inline-flex w-6 justify-start"><span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:120ms]">.</span><span className="animate-bounce [animation-delay:240ms]">.</span></span></p><p className="mt-1 max-w-xl truncate text-xs text-slate-300">Now exploring: {searchProgress.currentQuery}</p></div></div>
            <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-xl font-bold tabular-nums">{searchProgress.saved}</p><p className="text-[10px] uppercase tracking-wider text-slate-300">New saved</p></div><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-xl font-bold tabular-nums">{searchProgress.duplicates}</p><p className="text-[10px] uppercase tracking-wider text-slate-300">Duplicates</p></div><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-xl font-bold tabular-nums">{searchProgress.batch}</p><p className="text-[10px] uppercase tracking-wider text-slate-300">Batches</p></div></div>
          </div>
          <div className="relative mt-5"><div className="mb-2 flex items-center justify-between text-xs text-slate-300"><span>New-lead target progress</span><span>{searchProgress.target === null ? `All available mode · ${searchProgress.saved.toLocaleString()} saved` : `${Math.min(100, Math.round((searchProgress.saved / searchProgress.target) * 100))}% · ${Math.min(searchProgress.saved, searchProgress.target).toLocaleString()} / ${searchProgress.target.toLocaleString()} saved`}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 transition-all duration-700 ease-out" style={{ width: `${searchProgress.target === null ? 35 : Math.max(3, Math.min(100, (searchProgress.saved / searchProgress.target) * 100))}%` }} /><div className="-mt-2 h-2 w-1/4 animate-pulse rounded-full bg-white/30 blur-sm" /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"><span>{searchProgress.discovered.toLocaleString()} Google results checked · {searchProgress.apiRequests} API requests attempted</span><span>Each successful batch is shown immediately. Targets are maximums, not guarantees.</span></div></div>
        </div>}
        {lastSearch && <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-bold text-zinc-900 dark:text-white">Search completed</p><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{lastSearch.resultsReturned} results checked · {lastSearch.newlySaved} new saved · {lastSearch.duplicatesSkipped} duplicates skipped. {lastSearch.notice}</p></div></div>
          <span className="text-xs text-zinc-500">Google-sourced details follow the 30-day cache policy; manual records do not expire.</span>
        </div>}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total saved leads" value={totalLeadCount} detail="Unique saved leads" icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Details available" value={freshCount} detail="Available lead details" icon={<Building2 className="h-5 w-5" />} />
        <MetricCard label="Contacted" value={contactedCount} detail="Outreach started" icon={<Phone className="h-5 w-5" />} />
        <MetricCard label="Qualified" value={qualifiedCount} detail="Ready for next step" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-200/80 p-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="text-lg font-bold text-zinc-900 dark:text-white">Saved leads</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Newest leads first · add, edit, delete, and update outreach status.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={openCreateLead} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"><Plus className="h-4 w-4" /> Add lead</button>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter leads…" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 sm:w-56 dark:border-zinc-700 dark:bg-zinc-950" /></div>
            <select aria-label="Sort leads" value={sortDirection} onChange={(event) => { setSortDirection(event.target.value as "ASC" | "DESC"); setTablePage(1); }} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950"><option value="DESC">Newest / ID descending</option><option value="ASC">Oldest / ID ascending</option></select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | LeadStatus)} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="ALL">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 px-5 py-3 dark:border-zinc-800">
          <span className="mr-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{selectedLeadIds.length} selected</span>
          <button type="button" onClick={selectVisiblePage} disabled={!paginatedLeads.length} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700">Select visible page</button>
          <button type="button" onClick={selectFirstTwenty} disabled={!paginatedLeads.length} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700">Select 20 on this page</button>
          <button type="button" onClick={clearSelection} disabled={!selectedLeadIds.length} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700">Clear selection</button>
          <button type="button" onClick={() => openExportDialog('csv')} disabled={!selectedLeadIds.length} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Export selected</button>
          <button type="button" onClick={() => void deleteSelectedLeads()} disabled={!selectedLeadIds.length} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-40">Delete selected</button>
        </div>
        {loading ? <div className="flex items-center justify-center gap-3 p-16 text-sm text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading saved leads…</div> : totalLeadCount === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800"><MapPinned className="h-6 w-6" /></div><h3 className="mt-4 font-bold text-zinc-900 dark:text-white">{totalLeadCount ? 'No matching leads' : 'Your lead workspace is ready'}</h3><p className="mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">{totalLeadCount ? 'Try changing the search text or status filter.' : 'Run your first business search above. New leads will be saved here and checked against existing Place IDs.'}</p></div> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[1260px] text-left"><thead className="bg-zinc-50/80 text-[11px] uppercase tracking-[.12em] text-zinc-500 dark:bg-zinc-950/60"><tr><th className="px-4 py-4"><input type="checkbox" aria-label="Select all visible leads" checked={paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedLeadIds.includes(lead.id))} onChange={(event) => event.target.checked ? selectVisiblePage() : setSelectedLeadIds((current) => current.filter((id) => !paginatedLeads.some((lead) => lead.id === id)))} /></th><th className="px-4 py-4 font-semibold">Lead ID</th><th className="px-6 py-4 font-semibold">Business</th><th className="px-4 py-4 font-semibold">Website</th><th className="px-4 py-4 font-semibold">Rating</th><th className="px-4 py-4 font-semibold">Search</th><th className="px-4 py-4 font-semibold">Status</th><th className="px-4 py-4 font-semibold">Created</th><th className="px-4 py-4 font-semibold">Data expiry</th><th className="px-6 py-4 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{paginatedLeads.map((lead) => {
            const status = STATUS_OPTIONS.find((item) => item.value === lead.status) ?? STATUS_OPTIONS[0];
            return <tr key={lead.id} className={`transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 ${selectedLeadIds.includes(lead.id) ? "bg-brand-500/5" : ""}`}><td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${lead.businessName ?? "lead"}`} checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} /></td><td className="px-4 py-4 font-mono text-xs font-semibold text-zinc-500">#{lead.id}</td><td className="max-w-[360px] px-6 py-4"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Building2 className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{lead.businessName || 'Google Places details expired'}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{lead.formattedAddress || (lead.googleDataExpired ? 'Details cleared under retention policy' : 'Address not available')}</p>{lead.internationalPhone && <p className="mt-1 text-xs text-zinc-500">{lead.internationalPhone}</p>}</div></div></td><td className="px-4 py-4">{lead.websiteUrl ? <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-[180px] items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"><Globe2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{safeHost(lead.websiteUrl)}</span><ArrowUpRight className="h-3 w-3 shrink-0" /></a> : <span className="text-xs text-zinc-400">Not available</span>}</td><td className="px-4 py-4"><div className="min-w-[110px]"><p className="text-sm font-semibold text-amber-600">{lead.rating != null ? `★ ${lead.rating.toFixed(1)} / 5` : "—"}</p><p className="text-xs text-zinc-500">{lead.userRatingCount != null ? `${lead.userRatingCount.toLocaleString()} ratings` : "No rating count"}</p></div></td><td className="px-4 py-4"><p className="text-sm text-zinc-700 dark:text-zinc-300">{lead.searchKeyword}</p><p className="mt-1 text-xs text-zinc-500">{lead.searchCity}</p></td><td className="px-4 py-4"><select aria-label={`Status for ${lead.businessName ?? lead.placeId}`} value={lead.status} onChange={(event) => void updateStatus(lead, event.target.value as LeadStatus)} className={`max-w-[150px] rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none ring-1 ring-inset ring-current/10 ${status.classes}`}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td><td className="px-4 py-4 whitespace-nowrap text-xs text-zinc-500">{formatDate(lead.createdAt)}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 text-xs ${lead.googleDataExpired ? 'text-amber-600 dark:text-amber-300' : 'text-zinc-500 dark:text-zinc-400'}`}>{lead.googleSourced !== false ? <Clock3 className="h-3.5 w-3.5" /> : <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600">Manual</span>}{lead.googleSourced === false ? 'No expiry' : lead.googleDataExpired ? 'Expired' : formatDate(lead.googleDataExpiresAt)}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2">{lead.googleMapsUrl ? <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Open Google Maps" title="Open Google Maps" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"><MapPin className="h-4 w-4" /></a> : null}{lead.websiteUrl && <a href={lead.websiteUrl} target="_blank" rel="noreferrer" aria-label="Open website" title="Open website" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"><ExternalLink className="h-4 w-4" /></a>}<button type="button" onClick={() => openEditLead(lead)} aria-label="Edit lead" title="Edit lead" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void deleteLead(lead)} aria-label="Delete lead" title="Delete lead" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300"><Trash2 className="h-4 w-4" /></button></div></td></tr>;
          })}</tbody></table></div>
          <div className="flex flex-col gap-4 border-t border-zinc-200/80 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {totalLeadCount === 0 ? 0 : (safeTablePage - 1) * tablePageSize + 1}–{Math.min(safeTablePage * tablePageSize, totalLeadCount)} of {totalLeadCount} matching leads · newest first</span>
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
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between"><span>Google Maps attribution: Google Maps · Place IDs are retained for duplicate detection; Google-sourced details are cleared after 30 days. Manually maintained records do not use Google cache expiry.</span><a href="https://developers.google.com/maps/documentation/places/web-service/policies" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-300">Places API policies <ExternalLink className="h-3 w-3" /></a></div>
      {exportDialogOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title"><div className="my-auto w-full max-w-2xl space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 id="export-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-white">Export lead data</h2><p className="mt-1 text-sm text-zinc-500">Choose records and fields to include in the {exportFormat.toUpperCase()} file.</p></div><button type="button" onClick={() => setExportDialogOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close export dialog"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-2 sm:grid-cols-3">{([{value:'selected',label:`Selected (${selectedLeadIds.length})`},{value:'page',label:`Visible page (${paginatedLeads.length})`},{value:'all',label:`All leads (${totalLeadCount})`}] as const).map((item) => <label key={item.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${exportScope===item.value?'border-brand-500 bg-brand-500/5':'border-zinc-200 dark:border-zinc-700'}`}><input type="radio" name="exportScope" value={item.value} checked={exportScope===item.value} onChange={() => setExportScope(item.value)} />{item.label}</label>)}</div>
        <div><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Fields to include</h3><button type="button" className="text-xs font-semibold text-brand-600" onClick={() => setExportFields(['id','placeId','businessName','rating','userRatingCount','formattedAddress','websiteUrl','googleMapsUrl','internationalPhone','searchKeyword','searchCity','status','createdAt','googleDataExpiresAt','googleDataExpired'])}>Select all fields</button></div><div className="grid gap-2 sm:grid-cols-2">{([{key:'id',label:'Lead ID'},{key:'placeId',label:'Google Place ID'},{key:'businessName',label:'Business name'},{key:'rating',label:'Average rating / 5'},{key:'userRatingCount',label:'Number of ratings'},{key:'formattedAddress',label:'Address'},{key:'websiteUrl',label:'Website URL'},{key:'googleMapsUrl',label:'Google Maps URL'},{key:'internationalPhone',label:'Phone'},{key:'searchKeyword',label:'Search keyword'},{key:'searchCity',label:'City'},{key:'status',label:'Lead status'},{key:'createdAt',label:'Created date'},{key:'googleDataExpiresAt',label:'Data expiry date'},{key:'googleDataExpired',label:'Data expired'}] as const).map((field) => <label key={field.key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200"><input type="checkbox" checked={exportFields.includes(field.key)} onChange={(event) => setExportFields((current) => event.target.checked ? [...current, field.key] : current.filter((key) => key !== field.key))} />{field.label}</label>)}</div></div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setExportDialogOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold dark:border-zinc-700">Cancel</button><button type="button" onClick={() => void exportData()} disabled={exporting || exportingExcel || !exportFields.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />{exporting || exportingExcel ? 'Exporting…' : `Export ${exportFormat.toUpperCase()}`}</button></div>
      </div></div>}
      {leadEditorOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="lead-editor-title"><form onSubmit={saveLead} className="my-auto w-full max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 id="lead-editor-title" className="text-xl font-bold text-zinc-900 dark:text-white">{editingLead ? 'Edit lead' : 'Add lead manually'}</h2><p className="mt-1 text-sm text-zinc-500">Manually maintained details are not cleared by Google Places cache expiry.</p></div><button type="button" onClick={() => setLeadEditorOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2">{([['businessName','Business name',true],['searchCity','City / location',true],['formattedAddress','Address',false],['websiteUrl','Website URL',false],['googleMapsUrl','Google Maps URL',false],['internationalPhone','Phone number',false],['searchKeyword','Keyword / source note',false]] as const).map(([key,label,required]) => <label key={key} className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}{required ? ' *' : ''}</span><input required={required} type={key === 'websiteUrl' || key === 'googleMapsUrl' ? 'url' : 'text'} value={leadForm[key]} onChange={(event) => setLeadForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" /></label>)}<label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Status</span><select value={leadForm.status} onChange={(event) => setLeadForm((current) => ({ ...current, status: event.target.value as LeadStatus }))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950">{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setLeadEditorOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">Cancel</button><button type="submit" disabled={savingLead} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{savingLead ? 'Saving…' : editingLead ? 'Save changes' : 'Add lead'}</button></div></form></div>}
    </div>
  );
}

