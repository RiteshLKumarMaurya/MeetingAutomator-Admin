'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Search, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAdminFeatures } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';;
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { FeatureResponse } from '@/types';

// ============================================================
// Feature Modal (Create / Edit)
// ============================================================
function FeatureModal({
  feature,
  onClose,
}: {
  feature?: FeatureResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(feature?.name ?? '');
  const [description, setDescription] = useState(feature?.description ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    feature?.iconImage?.optimizedKey || null
  );
  const [removeIcon, setRemoveIcon] = useState(false);
  const [saving, setSaving] = useState(false);

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
const handleSave = async () => {
  if (!name.trim()) {
    toast.error('Feature name is required');
    return;
  }
  setSaving(true);
  try {
    const formData = new FormData();
    formData.append('name', name.trim());
    if (description.trim()) formData.append('description', description.trim());
    if (imageFile) formData.append('iconImageFile', imageFile);
    if (removeIcon) formData.append('removeIcon', 'true');

    if (feature) {
      await adminApi.updateFeature(feature.id, formData);
      toast.success('Feature updated');
    } else {
      if (!imageFile) {
        toast.error('Icon image is required');
        return;
      }
      await adminApi.createFeature(formData);
      toast.success('Feature created');
    }
    // Force refetch all features queries
    await qc.invalidateQueries({ queryKey: ['admin', 'features'] });
    onClose();
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to save');
  } finally {
    setSaving(false);
  }
};

  const hasExistingIcon = feature?.iconImage && !imageFile && !removeIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6"
      >
        <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-5">
          {feature ? 'Edit Feature' : 'Create Feature'}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Name *</label>
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Free Domain"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Description</label>
            <textarea
              className="input-base resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this feature"
            />
          </div>

          {/* Icon Image */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">
              Icon Image {!feature && '*'}
            </label>
            <div className="flex items-start gap-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Icon preview" className="w-full h-full object-cover" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
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
                {hasExistingIcon && (
                  <p className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-3 h-3" /> Current icon will be kept
                  </p>
                )}
                {removeIcon && (
                  <p className="flex items-center gap-1 text-red-500">
                    <Trash2 className="w-3 h-3" /> Icon will be removed
                  </p>
                )}
                {imageFile && (
                  <p className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" /> New icon selected
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
                {feature ? 'Update Feature' : 'Create Feature'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Features Page
// ============================================================
export default function AdminFeaturesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; feature?: FeatureResponse | null }>({ open: false });
  const { data, isLoading } = useAdminFeatures(page, 10); // page, size
  const qc = useQueryClient();

  // Client‑side search filter
  const filtered = (data?.content ?? []).filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableFeature(id);
      else await adminApi.enableFeature(id);
      toast.success(active ? 'Feature disabled' : 'Feature enabled');
      qc.invalidateQueries({ queryKey: ['admin', 'features'] });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this feature? This action cannot be undone.')) return;
    try {
      await adminApi.deleteFeature(id);
      toast.success('Feature deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'features'] });
    } catch {
      toast.error('Failed to delete feature');
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <FeatureModal feature={modal.feature} onClose={() => setModal({ open: false })} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Features</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {data?.totalElements ?? '—'} total features
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, feature: null })}
          className="btn-primary gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add Feature
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          className="input-base pl-9"
          placeholder="Search features by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Features Table */}
      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Icon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                // Skeleton
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="skeleton w-8 h-8 rounded-lg" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-32 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-48 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-8 w-24 rounded" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-400">
                    {search ? `No features matching "${search}"` : 'No features yet. Create your first one.'}
                  </td>
                </tr>
              ) : (
                filtered.map((feature, idx) => (
                  <motion.tr
                    key={feature.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      {feature.iconImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(feature.iconImage)}
                          alt={feature.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {feature.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{feature.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-500 truncate max-w-[240px]">{feature.description || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-semibold',
                          feature.active
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-zinc-100 text-zinc-500'
                        )}
                      >
                        {feature.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal({ open: true, feature })}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
                          title="Edit feature"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(feature.id, feature.active)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                          title={feature.active ? 'Disable' : 'Enable'}
                        >
                          {feature.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(feature.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 transition-colors"
                          title="Delete feature"
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
                  (data.first || data.number === 0) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
                className={cn(
                  'p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors',
                  data.last ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
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