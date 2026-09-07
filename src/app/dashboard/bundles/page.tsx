'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Star, StarOff, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Search
} from 'lucide-react';
import Link from 'next/link';
import { useAdminBundles, useAdminProjects, useAdminPackages, useAdminTestimonials, useDeleteBundle } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { ProjectBundleResponse, ProjectResponse, PackageResponse, TestimonialResponse } from '@/types';

// ============================================================
// Bundle Modal (Create / Edit) – JSON blob + file
// ============================================================
function BundleModal({
  bundle,
  onClose,
}: {
  bundle?: ProjectBundleResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  // Fetch all projects, packages, testimonials for dropdowns (use large size)
  const { data: allProjects } = useAdminProjects(0, 100);
  const { data: allPackages } = useAdminPackages(0, 100);
  const { data: allTestimonials } = useAdminTestimonials(0, 100);

  // Basic fields
  const [name, setName] = useState(bundle?.name ?? '');
  const [slug, setSlug] = useState(bundle?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(bundle?.shortDescription ?? '');
  const [fullDescription, setFullDescription] = useState(bundle?.fullDescription ?? '');
  const [featured, setFeatured] = useState(bundle?.featured ?? false);
  const [active, setActive] = useState(bundle?.active ?? true);

  // Thumbnail
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(
    bundle?.thumbImage?.optimizedKey || null
  );
  const [removeThumb, setRemoveThumb] = useState(false);

  // Selected projects (list of project IDs)
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>(
    bundle?.projects?.map(p => p.id) || []
  );
  const [projectSearch, setProjectSearch] = useState('');

  // Selected package
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    bundle?.packageEntity?.id || null
  );

  // Selected testimonial
  const [selectedTestimonialId, setSelectedTestimonialId] = useState<number | null>(
    bundle?.testimonial?.id || null
  );

  const [saving, setSaving] = useState(false);

  // Thumb handlers
  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbFile(file);
      setThumbPreview(URL.createObjectURL(file));
      setRemoveThumb(false);
    }
  };
  const handleRemoveThumb = () => {
    setThumbFile(null);
    setThumbPreview(null);
    setRemoveThumb(true);
  };

  // Project handlers
  const handleAddProject = (projectId: number) => {
    if (selectedProjectIds.includes(projectId)) {
      toast.error('Project already added');
      return;
    }
    setSelectedProjectIds(prev => [...prev, projectId]);
  };
  const handleRemoveProject = (projectId: number) => {
    setSelectedProjectIds(prev => prev.filter(id => id !== projectId));
  };
  const filteredProjects = allProjects?.content?.filter(p =>
    p.title.toLowerCase().includes(projectSearch.toLowerCase())
  ) ?? [];

  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPackageId(val ? Number(val) : null);
  };

  const handleTestimonialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTestimonialId(val ? Number(val) : null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Bundle name is required');
      return;
    }
    if (!shortDescription.trim()) {
      toast.error('Short description is required');
      return;
    }
    if (!bundle && !thumbFile) {
      toast.error('Thumbnail image is required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim() || undefined,
        featured,
        active,
        projects: selectedProjectIds.map(pid => ({ projectId: pid })),
      };
      if (selectedPackageId) payload.packageRequest = { packageId: selectedPackageId };
      if (selectedTestimonialId) payload.testimonial = { testimonialId: selectedTestimonialId };
      if (removeThumb) payload.removeThumb = true;

      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      if (thumbFile) formData.append('thumbImage', thumbFile);

      if (bundle) {
        await adminApi.updateBundle(bundle.id, formData);
        toast.success('Bundle updated');
      } else {
        await adminApi.createBundle(formData);
        toast.success('Bundle created');
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save bundle');
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
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-display text-xl font-bold mb-5">
          {bundle ? 'Edit Project Bundle' : 'Create Project Bundle'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Name *</label>
              <input className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Ecom Complete Ecosystem" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Slug (optional)</label>
              <input className="input-base" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Short Description *</label>
              <textarea className="input-base resize-none" rows={2} value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Full Description</label>
              <textarea className="input-base resize-none" rows={3} value={fullDescription} onChange={e => setFullDescription(e.target.value)} />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Thumbnail Image {!bundle && '*'}</label>
              <div className="flex items-start gap-3">
                {thumbPreview ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={thumbPreview} alt="Thumb" className="w-full h-full object-cover" />
                    <button onClick={handleRemoveThumb} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer hover:border-brand-400">
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px]">Upload</span>
                    <input type="file" accept="image/*" onChange={handleThumbChange} className="hidden" />
                  </label>
                )}
                <div className="flex-1 text-xs">
                  {bundle?.thumbImage && !thumbFile && !removeThumb && (
                    <p className="text-amber-600 flex gap-1"><AlertCircle className="w-3 h-3" /> Current thumbnail will be kept</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column – associations */}
          <div className="space-y-5">
            {/* Projects */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block">Projects in Bundle</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search projects..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                </div>
                <select className="input-base w-40 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddProject(Number(val)); e.target.value = ''; }} value="">
                  <option value="">Add project...</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              {selectedProjectIds.length === 0 ? (
                <p className="text-xs italic">No projects added.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50">
                  {selectedProjectIds.map(pid => {
                    const project = allProjects?.content?.find(p => p.id === pid);
                    return (
                      <div key={pid} className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                        <div className="flex-1 text-sm truncate">{project?.title || `Project ID ${pid}`}</div>
                        <button onClick={() => handleRemoveProject(pid)} className="text-red-500">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Package */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Associated Package (optional)</label>
              <select className="input-base" value={selectedPackageId ?? ''} onChange={handlePackageChange}>
                <option value="">None</option>
                {allPackages?.content?.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </div>

            {/* Testimonial */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Associated Testimonial (optional)</label>
              <select className="input-base" value={selectedTestimonialId ?? ''} onChange={handleTestimonialChange}>
                <option value="">None</option>
                {allTestimonials?.content?.map(ts => (
                  <option key={ts.id} value={ts.id}>{ts.clientName} - {ts.companyName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> {bundle ? 'Update' : 'Create'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Bundle View Modal (Quick View)
// ============================================================
function BundleViewModal({
  bundle,
  onClose,
}: {
  bundle: ProjectBundleResponse;
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
          <h3 className="font-display text-xl font-bold">{bundle.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            {bundle.thumbImage && <img src={getMediaUrl(bundle.thumbImage)} alt={bundle.name} className="w-16 h-16 rounded-lg object-cover" />}
            <div>
              <p className="text-sm text-zinc-500">Slug: {bundle.slug}</p>
              <div className="flex gap-2 mt-1">
                {bundle.featured && <span className="badge-amber text-xs">Featured</span>}
                <span className={cn('text-xs px-2 py-0.5 rounded-full', bundle.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100')}>
                  {bundle.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">Short Description</label>
            <p className="text-sm mt-1">{bundle.shortDescription}</p>
          </div>
          {bundle.fullDescription && (
            <div>
              <label className="text-xs font-semibold">Full Description</label>
              <p className="text-sm whitespace-pre-wrap">{bundle.fullDescription}</p>
            </div>
          )}

          {bundle.projects && bundle.projects.length > 0 && (
            <div>
              <label className="text-xs font-semibold">Projects in Bundle ({bundle.projects.length})</label>
              <div className="mt-1 space-y-1">
                {bundle.projects.map(p => (
                  <div key={p.id} className="text-sm">{p.title} – {p.projectDeliverableType}</div>
                ))}
              </div>
            </div>
          )}

          {bundle.packageEntity && (
            <div>
              <label className="text-xs font-semibold">Associated Package</label>
              <p className="text-sm">{bundle.packageEntity.name}</p>
            </div>
          )}

          {bundle.testimonial && (
            <div>
              <label className="text-xs font-semibold">Associated Testimonial</label>
              <p className="text-sm">{bundle.testimonial.clientName} – {bundle.testimonial.companyName}</p>
            </div>
          )}

          <div className="text-xs text-zinc-400 border-t pt-2">
            Created: {formatDate(bundle.createdAt)} | Updated: {formatDate(bundle.updatedAt)}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <Link href={`/projects?bundle=${bundle.id}`} className="btn-primary flex-1 justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> View Projects
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Admin Bundles Page
// ============================================================
export default function AdminBundlesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; bundle?: ProjectBundleResponse | null }>({ open: false });
  const [viewModal, setViewModal] = useState<ProjectBundleResponse | null>(null);
  const { data, isLoading, refetch } = useAdminBundles(page, 10);
  const { mutateAsync: deleteBundle } = useDeleteBundle();
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.shortDescription.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableBundle(id);
      else await adminApi.enableBundle(id);
      toast.success(active ? 'Disabled' : 'Enabled');
      await qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this bundle? This cannot be undone.')) return;
    try {
      await deleteBundle(id);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <BundleModal bundle={modal.bundle} onClose={() => setModal({ open: false })} />}
        {viewModal && <BundleViewModal bundle={viewModal} onClose={() => setViewModal(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Project Bundles</h1>
          <p className="text-sm text-zinc-500">{data?.totalElements ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal({ open: true, bundle: null })} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Bundle</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input className="input-base pl-9" placeholder="Search by name or short description..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="card-base animate-pulse">
              <div className="skeleton aspect-video rounded-xl mb-4" />
              <div className="skeleton h-4 w-2/3 rounded mb-2" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-zinc-400">
            {search ? `No bundles matching "${search}"` : 'No bundles yet. Create your first one.'}
          </div>
        ) : (
          filtered.map(b => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="card-base overflow-hidden p-0">
              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
                {b.thumbImage ? (
                  <img src={getMediaUrl(b.thumbImage)} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-900/20 to-violet-900/20">
                    <span className="text-2xl opacity-20">📦</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm',
                    b.active ? 'bg-emerald-500/90 text-white' : 'bg-zinc-500/90 text-white')}>
                    {b.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-zinc-900 dark:text-zinc-100 mb-1">{b.name}</h3>
                <p className="text-xs text-zinc-500 mb-1">{b.slug}</p>
                <p className="text-xs text-zinc-500 mb-3 truncate">{b.shortDescription}</p>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                  <span>{b.projects?.length ?? 0} projects</span>
                  {b.testimonial && <span>· Has testimonial</span>}
                  {b.packageEntity && <span>· {b.packageEntity.name}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewModal(b)} className="flex-1 flex items-center justify-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-500">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button onClick={() => setModal({ open: true, bundle: b })} className="flex-1 flex items-center justify-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-500">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleToggleActive(b.id, b.active)}
                    className={cn('flex items-center justify-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                      b.active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50')}>
                    {b.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(b.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-xs text-zinc-500">Page {(data.number ?? 0) + 1} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={data.number === 0}
              className="p-2 rounded-lg border disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => p+1)} disabled={data.last}
              className="p-2 rounded-lg border disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}