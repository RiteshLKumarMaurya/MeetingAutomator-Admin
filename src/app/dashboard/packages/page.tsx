'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Star, StarOff, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, GripVertical, Search, RefreshCw, ExternalLink
} from 'lucide-react';
import { useAdminPackages, useAdminServices, useDeletePackage } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';;
import { formatPrice, formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { PackageResponse, ServiceResponse, CurrencyCode } from '@/types';

const CURRENCIES: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'AED', label: 'Dirham', symbol: 'د.إ' },
];

// ============================================================
// Package Modal (Create / Edit)
// ============================================================
function PackageModal({
  package: pkg,
  onClose,
}: {
  package?: PackageResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: allServices } = useAdminServices(0, 100);

  // Basic fields
  const [name, setName] = useState(pkg?.name ?? '');
  const [slug, setSlug] = useState(pkg?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(pkg?.shortDescription ?? '');
  const [longDescription, setLongDescription] = useState(pkg?.longDescription ?? '');
  const [price, setPrice] = useState(pkg?.price?.toString() ?? '0');
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(
    (pkg?.currencyCode ?? 'USD') as CurrencyCode
  );
  const [displayOrder, setDisplayOrder] = useState(pkg?.displayOrder ?? 0);
  const [featured, setFeatured] = useState(pkg?.featured ?? false);
  const [active, setActive] = useState(pkg?.active ?? true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    pkg?.iconImage?.optimizedKey || null
  );
  const [removeImage, setRemoveImage] = useState(false);

  // Local service list – initialised from pkg (using serviceResponse)
  const [packageServices, setPackageServices] = useState<
    { serviceId: number; displayOrder: number; highlighted: boolean; service: ServiceResponse; mappingId?: number }[]
  >(() => {
    if (pkg?.services && Array.isArray(pkg.services)) {
      return pkg.services
        .map((ps) => {
          const svc = ps.serviceResponse;
          if (!svc?.id) return null;
          return {
            serviceId: svc.id,
            displayOrder: ps.displayOrder ?? 0,
            highlighted: false,
            service: svc,
            mappingId: ps.id,
          };
        })
        .filter(Boolean) as { serviceId: number; displayOrder: number; highlighted: boolean; service: ServiceResponse; mappingId: number }[];
    }
    return [];
  });

  const [serviceSearch, setServiceSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  // Refresh the whole package (and thus service list) from backend
  const refreshPackage = async () => {
    if (!pkg?.id) return;
    try {
      const res = await adminApi.getPackageById(pkg.id);
      const fresh = res.data.data;
      if (fresh?.services) {
        const mapped = fresh.services
          .map((ps) => {
            const svc = ps.serviceResponse;
            if (!svc?.id) return null;
            return {
              serviceId: svc.id,
              displayOrder: ps.displayOrder ?? 0,
              highlighted: false,
              service: svc,
              mappingId: ps.id,
            };
          })
          .filter(Boolean) as { serviceId: number; displayOrder: number; highlighted: boolean; service: ServiceResponse; mappingId: number }[];
        setPackageServices(mapped);
      }
    } catch (err) {
      console.error('Failed to refresh package:', err);
    }
  };

  // Add service using backend endpoint
  const handleAddService = async (serviceId: number) => {
    const service = allServices?.content?.find(s => s.id === serviceId);
    if (!service) return;
    if (packageServices.some(ps => ps.serviceId === serviceId)) {
      toast.error('Service already added');
      return;
    }
    if (!pkg?.id) {
      toast.error('Save package first before adding services');
      return;
    }
    setLoadingServices(true);
    try {
      await adminApi.addServiceToPackage(pkg.id, { serviceId, displayOrder: packageServices.length, highlighted: false });
      toast.success('Service added');
      await refreshPackage();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add service');
    } finally {
      setLoadingServices(false);
    }
  };

  // Remove service using backend endpoint
  const handleRemoveService = async (serviceId: number) => {
    const mappingId = packageServices.find(ps => ps.serviceId === serviceId)?.mappingId;
    if (!mappingId || !pkg?.id) return;
    setLoadingServices(true);
    try {
      await adminApi.removeServiceFromPackage(pkg.id, mappingId);
      toast.success('Service removed');
      await refreshPackage();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove service');
    } finally {
      setLoadingServices(false);
    }
  };

  // Reorder services (up/down) – safely handle undefined mappingId
  const moveService = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === packageServices.length - 1) return;
    const newOrder = [...packageServices];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    // Only include services that have a mappingId (already saved)
    const reorderPayload = newOrder
      .filter(ps => ps.mappingId !== undefined)
      .map((ps, idx) => ({
        mappingId: ps.mappingId!,
        displayOrder: idx,
      }));
    if (reorderPayload.length === 0) {
      toast.error('Cannot reorder unsaved services');
      return;
    }
    setLoadingServices(true);
    try {
      await adminApi.reorderPackageServices(pkg!.id, reorderPayload);
      toast.success('Services reordered');
      await refreshPackage();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reorder');
    } finally {
      setLoadingServices(false);
    }
  };

  // Toggle highlight (uses the update service endpoint)
  const toggleHighlight = async (index: number) => {
    const mappingId = packageServices[index].mappingId;
    if (!mappingId) {
      toast.error('Cannot highlight unsaved service');
      return;
    }
    const newHighlighted = !packageServices[index].highlighted;
    setLoadingServices(true);
    try {
      await adminApi.updatePackageService(pkg!.id, mappingId, { highlighted: newHighlighted });
      toast.success(newHighlighted ? 'Service highlighted' : 'Highlight removed');
      await refreshPackage();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update highlight');
    } finally {
      setLoadingServices(false);
    }
  };

  const filteredServices = allServices?.content?.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  ) ?? [];

  // Save basic fields + icon image (not services)
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Package name is required');
      return;
    }
    if (!shortDescription.trim()) {
      toast.error('Short description is required');
      return;
    }
    if (!pkg && !imageFile) {
      toast.error('Icon image is required for new packages');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim() || undefined,
        price: Number(price),
        currencyCode,
        displayOrder: Number(displayOrder),
        featured,
        active,
      };
      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (imageFile) formData.append('iconImageFile', imageFile);
      if (removeImage) formData.append('removeImage', 'true');

      if (pkg) {
        await adminApi.updatePackage(pkg.id, formData);
        toast.success('Package updated');
      } else {
        const res = await adminApi.createPackage(formData);
        // If new package was created, we could update the pkg reference, but we'll just close and refresh
        toast.success('Package created');
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'packages'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save package');
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
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-5">
          {pkg ? 'Edit Package' : 'Create Package'}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column – basic fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Name *</label>
              <input className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Ecom Starter Pack" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Slug (optional)</label>
              <input className="input-base" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated from name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Short Description *</label>
              <textarea className="input-base resize-none" rows={2} value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Long Description</label>
              <textarea className="input-base resize-none" rows={3} value={longDescription} onChange={e => setLongDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Price *</label>
                <input className="input-base" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Currency</label>
                <select className="input-base" value={currencyCode} onChange={e => setCurrencyCode(e.target.value as CurrencyCode)}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label} ({c.symbol})</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Display Order</label>
                <input className="input-base" type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Icon Image {!pkg && '*'}</label>
              <div className="flex items-start gap-3">
                {imagePreview ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50">
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
                  {pkg?.iconImage && !imageFile && !removeImage && (
                    <p className="flex items-center gap-1 text-amber-600"><AlertCircle className="w-3 h-3" /> Current icon will be kept</p>
                  )}
                  {removeImage && <p className="flex items-center gap-1 text-red-500"><Trash2 className="w-3 h-3" /> Icon will be removed</p>}
                  {imageFile && <p className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> New icon selected</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column – Services */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block">Services in this Package</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search services..." value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                </div>
                <select
                  className="input-base w-40 text-sm"
                  onChange={e => { const val = e.target.value; if (val) handleAddService(parseInt(val)); e.target.value = ''; }}
                  value=""
                  disabled={!pkg}
                >
                  <option value="">Add service...</option>
                  {filteredServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {loadingServices && <div className="text-xs text-zinc-400 mb-2">Updating services...</div>}
              {!pkg && (
                <p className="text-xs text-amber-600 italic">Save the package first to add services.</p>
              )}
              {packageServices.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No services added to this package.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/30">
                  {packageServices.map((ps, idx) => (
                    <div key={ps.serviceId} className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-800 rounded shadow-sm">
                      <GripVertical className="w-4 h-4 text-zinc-400 cursor-move" />
                      <div className="flex-1 text-sm truncate">{ps.service.name}</div>
                      <button
                        onClick={() => toggleHighlight(idx)}
                        className={cn('text-xs px-1.5 py-0.5 rounded', ps.highlighted ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500')}
                      >
                        {ps.highlighted ? '★ Highlighted' : 'Highlight'}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => moveService(idx, 'up')} disabled={idx === 0 || loadingServices} className="p-0.5 hover:bg-zinc-100 disabled:opacity-30">↑</button>
                        <button onClick={() => moveService(idx, 'down')} disabled={idx === packageServices.length-1 || loadingServices} className="p-0.5 hover:bg-zinc-100 disabled:opacity-30">↓</button>
                        <button onClick={() => handleRemoveService(ps.serviceId)} disabled={loadingServices} className="p-0.5 hover:bg-red-50 text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center gap-2 disabled:opacity-60">
            {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span> : <><CheckCircle2 className="w-4 h-4" /> {pkg ? 'Update Package' : 'Create Package'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Package View Modal (Quick View)
// ============================================================
function PackageViewModal({
  package: pkg,
  onClose,
}: {
  package: PackageResponse;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">{pkg.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            {pkg.iconImage && <img src={getMediaUrl(pkg.iconImage)} alt={pkg.name} className="w-16 h-16 rounded-lg object-cover" />}
            <div>
              <p className="text-sm text-zinc-500">Slug: <span className="font-mono">{pkg.slug}</span></p>
              <p className="text-sm text-zinc-500">Price: {formatPrice(pkg.price, pkg.currencyCode)}</p>
              <p className="text-sm text-zinc-500">Display Order: {pkg.displayOrder}</p>
              <div className="flex gap-2 mt-1">
                {pkg.featured && <span className="badge-amber text-xs">Featured</span>}
                <span className={cn('text-xs px-2 py-0.5 rounded-full', pkg.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500')}>
                  {pkg.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500">Short Description</label>
            <p className="text-sm mt-1">{pkg.shortDescription}</p>
          </div>
          {pkg.longDescription && (
            <div>
              <label className="text-xs font-semibold text-zinc-500">Full Description</label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{pkg.longDescription}</p>
            </div>
          )}

          {pkg.services && pkg.services.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-zinc-500">Services in this Package</label>
              <div className="mt-1 space-y-2">
                {pkg.services.map(ps => (
                  <div key={ps.id} className="flex items-start gap-2">
                    <div>
                      <p className="text-sm font-medium">{ps.serviceResponse?.name ?? 'Unknown Service'}</p>
                      <p className="text-xs text-zinc-500">{ps.serviceResponse?.shortDescription ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-zinc-400 border-t pt-2">
            Created: {formatDate(pkg.createdAt)} | Updated: {formatDate(pkg.updatedAt)}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <a href={`/packages/${pkg.slug}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> View Public Page
          </a>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Admin Packages Page
// ============================================================
export default function AdminPackagesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; package?: PackageResponse | null }>({ open: false });
  const [viewModal, setViewModal] = useState<PackageResponse | null>(null);
  const { data, isLoading, refetch } = useAdminPackages(page, 10);
  const { mutateAsync: deletePackage } = useDeletePackage();
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.shortDescription.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disablePackage(id);
      else await adminApi.enablePackage(id);
      toast.success(active ? 'Package disabled' : 'Package enabled');
      await qc.invalidateQueries({ queryKey: ['admin', 'packages'] });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleToggleFeatured = async (id: number, featured: boolean) => {
    try {
      if (featured) await adminApi.unfeaturePackage(id);
      else await adminApi.featurePackage(id);
      toast.success(featured ? 'Removed from featured' : 'Marked as featured');
      await qc.invalidateQueries({ queryKey: ['admin', 'packages'] });
    } catch {
      toast.error('Failed to update featured status');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete package "${name}"? This cannot be undone.`)) return;
    try {
      await deletePackage(id);
      toast.success('Package deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <PackageModal package={modal.package} onClose={() => setModal({ open: false })} />}
        {viewModal && <PackageViewModal package={viewModal} onClose={() => setViewModal(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Packages</h1>
          <p className="text-sm text-zinc-500 mt-1">{data?.totalElements ?? '—'} total packages</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal({ open: true, package: null })} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Package</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          className="input-base pl-9"
          placeholder="Search by name or short description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Services</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Featured</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400">
                    {search ? `No packages matching "${search}"` : 'No packages yet. Create your first one.'}
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">{p.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                        {formatPrice(p.price, p.currencyCode)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{p.services?.length ?? 0} services</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleFeatured(p.id, p.featured)}
                        className={cn('p-1.5 rounded-lg transition-colors',
                          p.featured ? 'text-amber-500 hover:bg-amber-50' : 'text-zinc-300 hover:text-amber-500 hover:bg-amber-50'
                        )}>
                        {p.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{p.displayOrder}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                        p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewModal(p)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" title="Quick View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModal({ open: true, package: p })} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(p.id, p.active)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400" title={p.active ? 'Disable' : 'Enable'}>
                          {p.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <a href={`/packages/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-brand-50 text-zinc-400 hover:text-brand-500" title="Public Page">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30">
            <span className="text-xs text-zinc-500">Page {(data.number ?? 0) + 1} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={data.first || data.number === 0} className="p-2 rounded-lg border disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={data.last} className="p-2 rounded-lg border disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}