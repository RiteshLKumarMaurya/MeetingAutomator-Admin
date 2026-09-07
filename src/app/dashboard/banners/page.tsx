'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Edit,
  X,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  useAdminBanners,
  useAdminServices,
  useAdminProjects,
  useAdminPackages,
  useAdminTestimonials,
  useAdminTechnologies,
} from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';;
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type {
  BannerResponse,
  BannerType,
  ServiceResponse,
  ProjectResponse,
  PackageResponse,
  TestimonialResponse,
  TechnologyResponse,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────
const BANNER_TYPES: { value: BannerType; label: string }[] = [
  { value: 'PACKAGE', label: 'Package' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'URL', label: 'External URL' },
  { value: 'TESTIMONIAL', label: 'Testimonial' },
  { value: 'TECHNOLOGY', label: 'Technology' },
];

// ─── Helper: build entity map for dropdown ──────────────────────
// Accepts any array of objects that have at least { id } and optional label fields.
// We cast to 'any' to avoid complex union typing (safe for admin UI).
function buildEntityMap(
  items: any[] | undefined,
  type: BannerType
): Map<number, string> {
  const map = new Map<number, string>();
  if (!items) return map;

  for (const item of items) {
    let label = `ID: ${item.id}`;

    // Use type‑specific fields to build a readable label
    if (type === 'SERVICE' && item.name) {
      label = item.name;
    } else if (type === 'PROJECT' && item.title) {
      label = item.title;
    } else if (type === 'PACKAGE' && item.name) {
      label = `${item.name} (${item.price} ${item.currencyCode})`;
    } else if (type === 'TESTIMONIAL' && item.clientName) {
      label = item.clientName;
    } else if (type === 'TECHNOLOGY' && item.name) {
      label = item.name;
    }

    map.set(item.id, label);
  }

  return map;
}

// ─── Custom hook to fetch entity list ──────────────────────────
function useEntityList(type: BannerType | null) {
  const services = useAdminServices(0, 100);
  const projects = useAdminProjects(0, 100);
  const packages = useAdminPackages(0, 100);
  const testimonials = useAdminTestimonials(0, 100);
  const technologies = useAdminTechnologies(0, 100);

  const getData = () => {
    switch (type) {
      case 'SERVICE': return services;
      case 'PROJECT': return projects;
      case 'PACKAGE': return packages;
      case 'TESTIMONIAL': return testimonials;
      case 'TECHNOLOGY': return technologies;
      default: return null;
    }
  };

  const result = getData();
  return {
    data: result?.data?.content ?? [],
    isLoading: result?.isLoading ?? false,
    refetch: result?.refetch,
  };
}

// ─── Banner Form Modal ───────────────────────────────────────────
function BannerFormModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BannerResponse> & { id?: number };
  onSave: (formData: FormData) => Promise<void>;
  saving: boolean;
}) {
  // ─── State ──────────────────────────────────────────────────
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initialData?.bannerImage?.optimizedKey || null
  );
  const [form, setForm] = useState({
    type: (initialData?.type as BannerType) || 'URL',
    redirectUrl: initialData?.redirectUrl || '',
    referenceId: initialData?.referenceId?.toString() || '',
    priority: String(initialData?.priority ?? 0),
    startAt: initialData?.startAt ? initialData.startAt.slice(0, 16) : '',
    endAt: initialData?.endAt ? initialData.endAt.slice(0, 16) : '',
    active: initialData?.active ?? true,
    cta: initialData?.cta || '',
    heading: initialData?.heading || '',
    subHeading: initialData?.subHeading || '',
  });

  // ─── Entity list for dropdown ──────────────────────────────
  const { data: entityList, isLoading: loadingEntities } = useEntityList(
    form.type !== 'URL' ? form.type : null
  );

  // ─── Reset form on open ────────────────────────────────────
  const prevTypeRef = useRef<BannerType | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreview(initialData?.bannerImage?.optimizedKey || null);
      setImage(null);
      setForm({
        type: (initialData?.type as BannerType) || 'URL',
        redirectUrl: initialData?.redirectUrl || '',
        referenceId: initialData?.referenceId?.toString() || '',
        priority: String(initialData?.priority ?? 0),
        startAt: initialData?.startAt ? initialData.startAt.slice(0, 16) : '',
        endAt: initialData?.endAt ? initialData.endAt.slice(0, 16) : '',
        active: initialData?.active ?? true,
        cta: initialData?.cta || '',
        heading: initialData?.heading || '',
        subHeading: initialData?.subHeading || '',
      });
    }
  }, [isOpen, initialData]);

  // Clear reference when type changes
  useEffect(() => {
    const currentType = form.type;
    const prevType = prevTypeRef.current;
    if (prevType === currentType) return;
    prevTypeRef.current = currentType;
    setForm((f) => ({ ...f, referenceId: '' }));
  }, [form.type]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreview(null);
    const fileInput = document.getElementById('banner-image-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async () => {
    // Validation
    if (!initialData?.id && !image) {
      toast.error('Please select a banner image');
      return;
    }
    if (form.type === 'URL' && !form.redirectUrl) {
      toast.error('Redirect URL is required for URL type banners');
      return;
    }
    if (form.type !== 'URL' && !form.referenceId) {
      toast.error(`Please select a ${form.type} for this banner`);
      return;
    }
    if (!form.startAt) {
      toast.error('Start date is required');
      return;
    }

    const fd = new FormData();

    // Always send image as 'file' (matches backend BannerRequest)
    if (image) {
      fd.append('file', image);
    }

    fd.append('type', form.type);
    if (form.redirectUrl) fd.append('redirectUrl', form.redirectUrl);
    if (form.referenceId) fd.append('referenceId', form.referenceId);
    fd.append('priority', form.priority);
    fd.append('active', String(form.active));
    fd.append('startAt', new Date(form.startAt).toISOString());
    if (form.endAt) fd.append('endAt', new Date(form.endAt).toISOString());

    // v2 fields
    if (form.cta) fd.append('cta', form.cta);
    if (form.heading) fd.append('heading', form.heading);
    if (form.subHeading) fd.append('subHeading', form.subHeading);

    await onSave(fd);
  };

  if (!isOpen) return null;

  const isUrlType = form.type === 'URL';
  const entityMap = buildEntityMap(entityList, form.type);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-100">
            {initialData?.id ? 'Edit Banner' : 'Create Banner'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">
              Banner Image {!initialData?.id && '*'}
            </label>
            <div className="relative">
              <label
                className={cn(
                  'relative flex flex-col items-center justify-center w-full aspect-[3/1] rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                  preview
                    ? 'border-transparent'
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-brand-400'
                )}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">Click to upload banner image</p>
                    <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
                      PNG, JPG, WebP — Recommended: 1920×480px
                    </p>
                  </div>
                )}
                <input
                  id="banner-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {preview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {initialData?.id && (
              <p className="text-xs text-zinc-400 mt-1">
                Leave empty to keep current image
              </p>
            )}
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Type *</label>
              <select
                className="input-base"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as BannerType }))}
              >
                {BANNER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">
                Priority (0 = highest)
              </label>
              <input
                className="input-base"
                type="number"
                min="0"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              />
            </div>
          </div>

          {/* Reference Dropdown */}
          {!isUrlType && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">
                {form.type} * (Select from list)
              </label>
              {loadingEntities ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading {form.type}s...
                </div>
              ) : (
                <select
                  className="input-base"
                  value={form.referenceId}
                  onChange={(e) => setForm((f) => ({ ...f, referenceId: e.target.value }))}
                >
                  <option value="">Select a {form.type}...</option>
                  {Array.from(entityMap.entries()).map(([id, label]) => (
                    <option key={id} value={String(id)}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              {entityMap.size === 0 && !loadingEntities && (
                <p className="text-xs text-amber-500 mt-1">
                  No {form.type}s found. Please create one first.
                </p>
              )}
            </div>
          )}

          {/* Redirect URL */}
          {isUrlType && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">
                Redirect URL *
              </label>
              <input
                className="input-base"
                placeholder="https://..."
                type="url"
                value={form.redirectUrl}
                onChange={(e) => setForm((f) => ({ ...f, redirectUrl: e.target.value }))}
              />
            </div>
          )}

          {/* v2 fields */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">
                CTA (Call‑to‑Action)
              </label>
              <input
                className="input-base"
                placeholder="e.g. Learn More"
                value={form.cta}
                onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Heading</label>
              <input
                className="input-base"
                placeholder="Main heading"
                value={form.heading}
                onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Sub‑heading</label>
              <input
                className="input-base"
                placeholder="Sub‑heading text"
                value={form.subHeading}
                onChange={(e) => setForm((f) => ({ ...f, subHeading: e.target.value }))}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Start Date *</label>
              <input
                className="input-base"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">End Date</label>
              <input
                className="input-base"
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-300"
            />
            <label htmlFor="active" className="text-sm text-zinc-700 dark:text-zinc-300">
              Active (visible on website)
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1 justify-center disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : initialData?.id ? (
              'Update Banner'
            ) : (
              'Create Banner'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function AdminBannersPage() {
  const { data: banners, isLoading } = useAdminBanners();
  const [showCreate, setShowCreate] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  // ─── Handlers ───────────────────────────────────────────────
  const handleToggle = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableBanner(id);
      else await adminApi.enableBanner(id);
      toast.success(active ? 'Banner disabled' : 'Banner enabled');
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update banner');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this banner? This cannot be undone.')) return;
    try {
      await adminApi.deleteBanner(id);
      toast.success('Banner deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete banner');
    }
  };

  const handleCreate = async (formData: FormData) => {
    setSaving(true);
    try {
      await adminApi.createBanner(formData);
      toast.success('Banner created successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create banner');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number, formData: FormData) => {
    setSaving(true);
    try {
      await adminApi.updateBanner(id, formData);
      toast.success('Banner updated successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      setEditingBanner(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update banner');
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...(banners ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  return (
    <div>
      {/* Modals */}
      <BannerFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        saving={saving}
      />
      <BannerFormModal
        isOpen={!!editingBanner}
        onClose={() => setEditingBanner(null)}
        initialData={editingBanner || undefined}
        onSave={(fd) => (editingBanner ? handleUpdate(editingBanner.id, fd) : Promise.resolve())}
        saving={saving}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Banners
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {banners?.length ?? '—'} total · shown in order of priority
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Banner
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="card-base animate-pulse">
                  <div className="skeleton w-full aspect-[3/1] rounded-xl mb-3" />
                  <div className="skeleton h-4 w-1/2 rounded mb-2" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
              ))
          : sorted.map((banner) => (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base overflow-hidden p-0"
              >
                <div className="relative aspect-[3/1] bg-zinc-100 dark:bg-zinc-800">
                  {banner.bannerImage ? (
                    <img
                      src={getMediaUrl(banner.bannerImage)}
                      alt={`Banner ${banner.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm',
                        banner.active
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-zinc-600/90 text-white'
                      )}
                    >
                      {banner.active ? '● LIVE' : '○ OFF'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-900/70 text-white backdrop-blur-sm">
                      {banner.type}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-600/90 text-white backdrop-blur-sm">
                      P{banner.priority}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Banner #{banner.id}
                    </p>
                    {banner.type !== 'URL' && banner.referenceId && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {banner.type} ID: {banner.referenceId}
                      </p>
                    )}
                    {banner.redirectUrl && (
                      <a
                        href={banner.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-500 flex items-center gap-1 mt-0.5 hover:underline truncate"
                      >
                        {banner.redirectUrl} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                    {banner.startAt && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatDate(banner.startAt)}{' '}
                        {banner.endAt ? `→ ${formatDate(banner.endAt)}` : '→ No end'}
                      </p>
                    )}
                    {(banner.heading || banner.subHeading || banner.cta) && (
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                        {banner.heading && <p>📌 {banner.heading}</p>}
                        {banner.subHeading && <p>📝 {banner.subHeading}</p>}
                        {banner.cta && <p>🔗 {banner.cta}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBanner(banner)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-900/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggle(banner.id, banner.active)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors',
                        banner.active
                          ? 'border-amber-200 dark:border-amber-900/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                          : 'border-emerald-200 dark:border-emerald-900/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                      )}
                    >
                      {banner.active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Disable
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Enable
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
      </div>

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium mb-1">No banners yet</p>
          <p className="text-sm text-zinc-400 mb-6">
            Create your first banner to display on the homepage
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Create First Banner
          </button>
        </div>
      )}
    </div>
  );
}