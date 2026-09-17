'use client';

import { useState } from 'react';
import { Eye, EyeOff, PanelTop, RefreshCw, Save } from 'lucide-react';
import { useAdminSiteModules } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { SiteModuleResponse } from '@/types';

export default function SiteModulesPage() {
  const qc = useQueryClient();
  const { data: modules = [], isLoading, isError, refetch } = useAdminSiteModules();
  const [saving, setSaving] = useState<number | null>(null);

  async function toggle(module: SiteModuleResponse) {
    setSaving(module.id);
    try {
      if (module.active) await adminApi.disableSiteModule(module.id);
      else await adminApi.enableSiteModule(module.id);
      await qc.invalidateQueries({ queryKey: ['admin', 'site-modules'] });
      toast.success(`${module.name} ${module.active ? 'hidden' : 'visible'}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update module');
    } finally {
      setSaving(null);
    }
  }

  async function updateOrder(module: SiteModuleResponse, value: number) {
    if (Number.isNaN(value)) return;
    setSaving(module.id);
    try {
      await adminApi.updateSiteModule(module.id, { displayOrder: Math.max(0, value) });
      await qc.invalidateQueries({ queryKey: ['admin', 'site-modules'] });
      toast.success('Display order saved');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save order');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-500">
            <PanelTop className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[.18em]">Public website control</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Site Modules</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Turn public website sections on or off without changing frontend code. Changes are applied through the live CMS API.
          </p>
        </div>
        <button className="btn-secondary inline-flex items-center gap-2" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isError ? (
        <div className="card-base border-red-200 p-10 text-center dark:border-red-900/50">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Could not load site modules.</p>
          <p className="mt-1 text-sm text-zinc-500">Check that the backend is reachable and your admin session is valid.</p>
          <button className="btn-primary mt-5" onClick={() => refetch()}>Retry</button>
        </div>
      ) : isLoading ? (
        <div className="card-base flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading live modules…
        </div>
      ) : modules.length === 0 ? (
        <div className="card-base border-dashed p-10 text-center">
          <PanelTop className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
          <h2 className="mt-4 font-display font-bold text-zinc-900 dark:text-zinc-100">No modules configured yet</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-zinc-500">
            The backend initializer creates the default Meeting Automator modules on startup. Deploy the latest backend once, then refresh this page.
          </p>
          <button className="btn-secondary mt-5" onClick={() => refetch()}>Check again</button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-[.16em] text-zinc-400">
            <span>{modules.length} modules</span>
            <span>{modules.filter((module) => module.active).length} visible</span>
          </div>
          {modules.map((module) => (
            <div key={module.id} className="card-base flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <PanelTop className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-zinc-900 dark:text-zinc-100">{module.name}</strong>
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {module.moduleKey}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{module.description || 'Public website section.'}</p>
              </div>

              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Order
                <input
                  className="input-base w-20 py-1.5"
                  type="number"
                  min="0"
                  defaultValue={module.displayOrder}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (value !== module.displayOrder) updateOrder(module, value);
                  }}
                  aria-label={`Display order for ${module.name}`}
                />
              </label>

              <button
                disabled={saving === module.id}
                onClick={() => toggle(module)}
                className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${module.active
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              >
                {saving === module.id ? <Save className="h-4 w-4 animate-pulse" /> : module.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {saving === module.id ? 'Saving…' : module.active ? 'Visible' : 'Hidden'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
