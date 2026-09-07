'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, ExternalLink, Search, ChevronLeft, ChevronRight,
  Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAdminLinks } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';;
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { LinkResponse, LinkType } from '@/types';

// ============================================================
// Link Types (exact match to backend LinkType enum)
// ============================================================
const LINK_TYPES: { value: LinkType; label: string; icon?: string }[] = [
  { value: 'WEBSITE', label: 'Website', icon: '🌐' },
  { value: 'LANDING_PAGE', label: 'Landing Page', icon: '📄' },
  { value: 'PLAY_STORE', label: 'Play Store', icon: '📱' },
  { value: 'APP_STORE', label: 'App Store', icon: '🍎' },
  { value: 'ADMIN_PANEL', label: 'Admin Panel', icon: '⚙️' },
  { value: 'DELIVERY_APP', label: 'Delivery App', icon: '🚚' },
  { value: 'GITHUB', label: 'GitHub', icon: '🐙' },
  { value: 'YOUTUBE', label: 'YouTube', icon: '▶️' },
  { value: 'FIGMA', label: 'Figma', icon: '🎨' },
  { value: 'DOCUMENTATION', label: 'Documentation', icon: '📚' },
  { value: 'OTHER', label: 'Other', icon: '🔗' },
];

// ============================================================
// Modal Component – Create / Edit Link
// ============================================================
function LinkModal({ link, onClose }: { link?: LinkResponse | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(link?.name ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [description, setDescription] = useState(link?.description ?? '');
  const [linkType, setLinkType] = useState<LinkType>(link?.linkType ?? 'OTHER');
  const [iconImageFile, setIconImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(link?.iconImage?.optimizedKey || null);
  const [removeIcon, setRemoveIcon] = useState(false);  // flag to delete existing icon
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveIcon(false); // new image overrides removal
    }
  };

  const handleRemoveImage = () => {
    setIconImageFile(null);
    setImagePreview(null);
    setRemoveIcon(true); // tell backend to delete current icon
  };

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('url', url.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('linkType', linkType);
      if (iconImageFile) formData.append('iconImageFile', iconImageFile);
      if (removeIcon) formData.append('removeIcon', 'true');

      if (link) {
        await adminApi.updateLink(link.id, formData);
        toast.success('Link updated successfully');
      } else {
        await adminApi.createLink(formData);
        toast.success('Link created successfully');
      }
      qc.invalidateQueries({ queryKey: ['admin', 'links'] });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const hasExistingIcon = link?.iconImage && !iconImageFile && !removeIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-5">
          {link ? 'Edit Link' : 'Create New Link'}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Name *</label>
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GitHub Repository"
            />
          </div>

          {/* URL */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">URL *</label>
            <input
              className="input-base"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Link Type */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Type</label>
            <div className="relative">
              <select
                className="input-base appearance-none"
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as LinkType)}
              >
                {LINK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Description (optional)</label>
            <textarea
              className="input-base resize-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>

          {/* Icon Image */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Icon Image (optional)</label>
            <div className="flex items-start gap-3">
              {imagePreview ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Icon preview" className="w-full h-full object-cover" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                    title="Remove icon"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-brand-400 transition-colors bg-zinc-50 dark:bg-zinc-800">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-[10px] text-zinc-400 mt-1">Upload</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
              <div className="flex-1 text-xs text-zinc-500">
                {hasExistingIcon && (
                  <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" />
                    Current icon will be kept
                  </p>
                )}
                {removeIcon && (
                  <p className="flex items-center gap-1 text-red-500">
                    <Trash2 className="w-3 h-3" />
                    Icon will be removed
                  </p>
                )}
                {iconImageFile && (
                  <p className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" />
                    New icon selected
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {link ? 'Update Link' : 'Create Link'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================
export default function AdminLinksPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; link?: LinkResponse | null }>({ open: false });
  const { data, isLoading } = useAdminLinks(page, 10);
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.url.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this link? This action cannot be undone.')) return;
    try {
      await adminApi.deleteLink(id);
      toast.success('Link deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'links'] });
    } catch {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <LinkModal link={modal.link} onClose={() => setModal({ open: false })} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Links</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage external links – GitHub, Play Store, Documentation, etc.
            {data && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800">
                {data.totalElements} total
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, link: null })}
          className="btn-primary gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add New Link
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          className="input-base pl-9"
          placeholder="Search by name or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Links Table */}
      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Icon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name / Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                // Skeleton loader
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="skeleton w-8 h-8 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-32 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-48 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-8 w-16 rounded" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-400">
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <p className="text-sm">No links found</p>
                      <button
                        onClick={() => setModal({ open: true, link: null })}
                        className="text-brand-500 text-sm hover:underline mt-1"
                      >
                        + Create your first link
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((link, idx) => (
                  <motion.tr
                    key={link.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      {link.iconImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(link.iconImage)}
                          alt={link.name}
                          className="w-8 h-8 rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base">
                          {LINK_TYPES.find(t => t.value === link.linkType)?.icon || '🔗'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{link.name}</p>
                      {link.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1 max-w-[200px]">{link.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 truncate max-w-[220px]"
                      >
                        {link.url.length > 40 ? link.url.slice(0, 37) + '...' : link.url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <span>{LINK_TYPES.find(t => t.value === link.linkType)?.icon}</span>
                        <span>{LINK_TYPES.find(t => t.value === link.linkType)?.label || link.linkType}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal({ open: true, link })}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-brand-500 transition-colors"
                          title="Edit link"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
            <span className="text-xs text-zinc-500">
              Page {(data.number ?? 0) + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first || data.number === 0}
                className={cn(
                  'p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors',
                  (data.first || data.number === 0)
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300'
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
                className={cn(
                  'p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors',
                  data.last
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300'
                )}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}