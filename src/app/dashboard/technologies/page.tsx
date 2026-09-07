'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Search, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, Link as LinkIcon, GripVertical,
  ExternalLink, RefreshCw
} from 'lucide-react';
import { useAdminTechnologies, useAdminLinks, useDeleteTechnology } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';;
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { TechnologyResponse, LinkResponse } from '@/types';

// ============================================================
// Technology Modal (Create / Edit) – JSON blob + file
// ============================================================
function TechnologyModal({
  technology,
  onClose,
}: {
  technology?: TechnologyResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: allLinks } = useAdminLinks(0, 100);

  // Form fields
  const [name, setName] = useState(technology?.name ?? '');
  const [slug, setSlug] = useState(technology?.slug ?? '');
  const [description, setDescription] = useState(technology?.description ?? '');
  const [active, setActive] = useState(technology?.active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    technology?.iconImage?.optimizedKey || null
  );
  const [removeIcon, setRemoveIcon] = useState(false);

  // Links – map from backend TechnologyLinkResponse
  const [techLinks, setTechLinks] = useState<
    { linkId: number; displayOrder: number; link?: LinkResponse }[]
  >(() => {
    if (technology?.links && Array.isArray(technology.links)) {
      return technology.links.map((tl, idx) => ({
        linkId: tl.link.id,
        displayOrder: tl.displayOrder ?? idx,
        link: tl.link,
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveIcon(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveIcon(true);
  };

  const handleAddLink = (linkId: number) => {
    const link = allLinks?.content?.find((l) => l.id === linkId);
    if (!link) return;
    if (techLinks.some((tl) => tl.linkId === linkId)) {
      toast.error('Link already added');
      return;
    }
    setTechLinks((prev) => [
      ...prev,
      { linkId, displayOrder: prev.length, link },
    ]);
  };

  const handleRemoveLink = (linkId: number) => {
    setTechLinks((prev) => prev.filter((tl) => tl.linkId !== linkId));
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === techLinks.length - 1) return;
    const newLinks = [...techLinks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];
    setTechLinks(newLinks);
  };

  const filteredLinks = allLinks?.content?.filter((link) =>
    link.name.toLowerCase().includes(linkSearch.toLowerCase()) ||
    link.url.toLowerCase().includes(linkSearch.toLowerCase())
  ) ?? [];

  // Save using JSON blob + file
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Technology name is required');
      return;
    }
    if (!technology && !imageFile) {
      toast.error('Icon image is required for new technologies');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      // Build JSON payload (all non‑file fields)
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        active,
        technologyLinks: techLinks.map((tl, idx) => ({
          linkId: tl.linkId,
          displayOrder: idx,
        })),
      };

      // Append JSON as blob with correct content type
      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      // Append icon image file
      if (imageFile) formData.append('iconImage', imageFile);
      if (removeIcon) formData.append('removeIcon', 'true');

      if (technology) {
        await adminApi.updateTechnology(technology.id, formData);
        toast.success('Technology updated');
      } else {
        await adminApi.createTechnology(formData);
        toast.success('Technology created');
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'technologies'] });
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err?.response?.data?.message || 'Failed to save technology');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-5">
          {technology ? 'Edit Technology' : 'Create Technology'}
        </h3>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Name *</label>
            <input className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., React.js" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Slug (optional)</label>
            <input className="input-base" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated from name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Description</label>
            <textarea className="input-base resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of this technology" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="active" className="text-sm text-zinc-700 dark:text-zinc-300">Active (visible on website)</label>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Icon Image {!technology && '*'}</label>
            <div className="flex items-start gap-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Icon preview" className="w-full h-full object-cover" />
                  <button onClick={handleRemoveImage} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-brand-400 transition-colors bg-zinc-50 dark:bg-zinc-800">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 mt-1">Upload</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
              <div className="flex-1 text-xs text-zinc-500">
                {technology?.iconImage && !imageFile && !removeIcon && (
                  <p className="flex items-center gap-1 text-amber-600"><AlertCircle className="w-3 h-3" /> Current icon will be kept</p>
                )}
                {removeIcon && <p className="flex items-center gap-1 text-red-500"><Trash2 className="w-3 h-3" /> Icon will be removed</p>}
                {imageFile && <p className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> New icon selected</p>}
              </div>
            </div>
          </div>

          {/* Technology Links Section */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
              <LinkIcon className="w-3 h-3" /> Associated Links (optional)
            </label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input type="text" placeholder="Search links to associate..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              </div>
              <select className="input-base w-48 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddLink(parseInt(val)); e.target.value = ''; }} value="">
                <option value="">Add link...</option>
                {filteredLinks.map(link => (
                  <option key={link.id} value={link.id}>{link.name} ({link.linkType})</option>
                ))}
              </select>
            </div>
            {techLinks.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No links associated yet.</p>
            ) : (
              <div className="space-y-2 border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800/30">
                {techLinks.map((tl, idx) => (
                  <div key={tl.linkId} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                    <GripVertical className="w-4 h-4 text-zinc-400 cursor-move" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{tl.link?.name || `Link ID ${tl.linkId}`}</p>
                      <p className="text-xs text-zinc-400 truncate">{tl.link?.url || ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30">↑</button>
                      <button onClick={() => moveLink(idx, 'down')} disabled={idx === techLinks.length - 1} className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30">↓</button>
                      <button onClick={() => handleRemoveLink(tl.linkId)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || (!technology && !imageFile)} className="btn-primary flex-1 justify-center gap-2 disabled:opacity-60">
            {saving ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> {technology ? 'Update Technology' : 'Create Technology'}</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Technologies Page
// ============================================================
export default function AdminTechnologiesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; technology?: TechnologyResponse | null }>({ open: false });
  const { data, isLoading, refetch } = useAdminTechnologies(page, 10);
  const { mutateAsync: deleteTech } = useDeleteTechnology();
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter((tech) =>
    tech.name.toLowerCase().includes(search.toLowerCase()) ||
    (tech.description && tech.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleToggle = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableTechnology(id);
      else await adminApi.enableTechnology(id);
      toast.success(active ? 'Technology disabled' : 'Technology enabled');
      await qc.invalidateQueries({ queryKey: ['admin', 'technologies'] });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete technology "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteTech(id);
      toast.success('Technology deleted');
    } catch {
      toast.error('Failed to delete technology');
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <TechnologyModal technology={modal.technology} onClose={() => setModal({ open: false })} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Technologies</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{data?.totalElements ?? '—'} total technologies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal({ open: true, technology: null })} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Technology</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input className="input-base pl-9" placeholder="Search by name or description..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Icon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Links</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="skeleton w-8 h-8 rounded-lg" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-40 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-12 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-8 w-20 rounded" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400">
                    {search ? `No technologies matching "${search}"` : 'No technologies yet. Create your first one.'}
                  </td>
                </tr>
              ) : (
                filtered.map((tech) => (
                  <motion.tr
                    key={tech.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {tech.iconImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getMediaUrl(tech.iconImage)} alt={tech.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {tech.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{tech.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{tech.slug}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                      {tech.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{tech.links?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                        tech.active ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}>
                        {tech.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {tech.createdAt ? formatDate(tech.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ open: true, technology: tech })} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(tech.id, tech.active)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400" title={tech.active ? 'Disable' : 'Enable'}>
                          {tech.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(tech.id, tech.name)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <a href={`/technologies/${tech.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20 text-zinc-400 hover:text-brand-500" title="View public">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
            <span className="text-xs text-zinc-500">Page {(data.number ?? 0) + 1} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={data.first || data.number === 0}
                className={cn('p-2 rounded-lg border border-zinc-200 dark:border-zinc-700', (data.first || data.number === 0) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={data.last}
                className={cn('p-2 rounded-lg border border-zinc-200 dark:border-zinc-700', data.last ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}