'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Star, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, Link as LinkIcon, GripVertical,
  Search, RefreshCw, Image as ImageIcon, ExternalLink, Maximize2
} from 'lucide-react';
import { useAdminTestimonials, useAdminLinks, useDeleteTestimonial } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { TestimonialResponse, LinkResponse, TestimonialBannerImageResponse } from '@/types';

const DESIGNATION_TYPES = [
  { value: 'CEO', label: 'CEO' },
  { value: 'FOUNDER', label: 'Founder' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'PRESIDENT', label: 'President' },
];

// ============================================================
// Testimonial Modal (Create / Edit) – JSON blob + files
// ============================================================
function TestimonialModal({
  testimonial,
  onClose,
}: {
  testimonial?: TestimonialResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: allLinks } = useAdminLinks(0, 100);

  // Basic fields
  const [clientName, setClientName] = useState(testimonial?.clientName ?? '');
  const [companyName, setCompanyName] = useState(testimonial?.companyName ?? '');
  const [designationType, setDesignationType] = useState(testimonial?.designationType ?? 'CEO');
  const [review, setReview] = useState(testimonial?.review ?? '');
  const [rating, setRating] = useState(testimonial?.rating ?? 5);
  const [featured, setFeatured] = useState(testimonial?.featured ?? false);
  const [active, setActive] = useState(testimonial?.active ?? true);
  const [clientId, setClientId] = useState(testimonial?.clientId?.toString() ?? '');

  // Thumbnail
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(
    testimonial?.thumbImage?.optimizedKey || null
  );
  const [removeThumb, setRemoveThumb] = useState(false);

  // Banner images – using TestimonialBannerImageResponse (id + media)
  const [existingBanners, setExistingBanners] = useState<TestimonialBannerImageResponse[]>(
    testimonial?.bannerImages || []
  );
  const [newBannerFiles, setNewBannerFiles] = useState<File[]>([]);
  const [newBannerPreviews, setNewBannerPreviews] = useState<string[]>([]);
  const [removeBannerIds, setRemoveBannerIds] = useState<number[]>([]);

  // Links
  const [testimonialLinks, setTestimonialLinks] = useState<
    { linkId: number; displayOrder: number; link?: LinkResponse }[]
  >(() => {
    if (testimonial?.links) {
      return testimonial.links.map((tl, idx) => ({
        linkId: tl.link.id,
        displayOrder: idx,
        link: tl.link,
      }));
    }
    return [];
  });
  const [linkSearch, setLinkSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Handlers
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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setNewBannerFiles(prev => [...prev, ...files]);
      setNewBannerPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    }
  };
  const removeExistingBanner = (id: number) => {
    setExistingBanners(prev => prev.filter(b => b.id !== id));
    setRemoveBannerIds(prev => [...prev, id]);
  };
  const removeNewBanner = (index: number) => {
    setNewBannerFiles(prev => prev.filter((_, i) => i !== index));
    setNewBannerPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = (linkId: number) => {
    const link = allLinks?.content?.find(l => l.id === linkId);
    if (!link) return;
    if (testimonialLinks.some(tl => tl.linkId === linkId)) {
      toast.error('Link already added');
      return;
    }
    setTestimonialLinks(prev => [...prev, { linkId, displayOrder: prev.length, link }]);
  };
  const handleRemoveLink = (linkId: number) => {
    setTestimonialLinks(prev => prev.filter(tl => tl.linkId !== linkId));
  };
  const moveLink = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === testimonialLinks.length - 1) return;
    const newLinks = [...testimonialLinks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];
    setTestimonialLinks(newLinks);
  };
  const filteredLinks = allLinks?.content?.filter(link =>
    link.name.toLowerCase().includes(linkSearch.toLowerCase()) ||
    link.url.toLowerCase().includes(linkSearch.toLowerCase())
  ) ?? [];

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!review.trim()) {
      toast.error('Review text is required');
      return;
    }
    if (!testimonial && !thumbFile) {
      toast.error('Thumbnail image is required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      // JSON payload
      const payload: any = {
        clientName: clientName.trim(),
        companyName: companyName.trim() || undefined,
        designationType,
        review: review.trim(),
        rating,
        featured,
        active,
        links: testimonialLinks.map((tl, idx) => ({
          linkId: tl.linkId,
          displayOrder: idx,
        })),
      };
      if (!testimonial) {
        if (!clientId) {
          toast.error('Client ID is required for new testimonials');
          return;
        }
        payload.clientId = Number(clientId);
      } else {
        if (removeBannerIds.length) payload.removeBannerIds = removeBannerIds;
        if (clientId) payload.clientId = Number(clientId);
      }

      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      // Thumbnail file
      if (thumbFile) formData.append('thumbImageFile', thumbFile);
      if (removeThumb) formData.append('removeThumb', 'true');

      // New banner files
      newBannerFiles.forEach(file => formData.append('bannerImageFiles', file));

      if (testimonial) {
        await adminApi.updateTestimonial(testimonial.id, formData);
        toast.success('Testimonial updated');
      } else {
        await adminApi.createTestimonial(formData);
        toast.success('Testimonial created');
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save testimonial');
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
          {testimonial ? 'Edit Testimonial' : 'Create Testimonial'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Client Name *</label>
              <input className="input-base" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Company Name</label>
              <input className="input-base" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Designation</label>
              <select className="input-base" value={designationType} onChange={e => setDesignationType(e.target.value)}>
                {DESIGNATION_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block">Rating (1-5) *</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(star)}>
                    <Star className={cn('w-6 h-6', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600')} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm">Featured</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Client User ID {!testimonial && '*'}</label>
              <input className="input-base" type="number" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Link to registered user" />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Review *</label>
              <textarea className="input-base resize-none" rows={4} value={review} onChange={e => setReview(e.target.value)} placeholder="What did the client say?" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Thumbnail Image {!testimonial && '*'}</label>
              <div className="flex items-start gap-3">
                {thumbPreview ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={thumbPreview} alt="Thumb preview" className="w-full h-full object-cover" />
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
                  {testimonial?.thumbImage && !thumbFile && !removeThumb && (
                    <p className="text-amber-600 flex gap-1"><AlertCircle className="w-3 h-3" /> Current thumbnail will be kept</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Banner Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {/* ✅ UNIQUE KEY: id + index */}
                {existingBanners.map((b, idx) => (
                  <div key={`existing-banner-${b.id}-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={getMediaUrl(b.media)} alt="Banner" className="w-full h-full object-cover" />
                    <button onClick={() => removeExistingBanner(b.id)} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {newBannerPreviews.map((preview, idx) => (
                  <div key={`new-banner-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={preview} alt="New" className="w-full h-full object-cover" />
                    <button onClick={() => removeNewBanner(idx)} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label key="add-banner-btn" className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer hover:border-brand-400">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px]">Add</span>
                  <input type="file" accept="image/*" multiple onChange={handleBannerChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-zinc-400">Recommended: 1200×800px. Multiple allowed.</p>
            </div>
          </div>
        </div>

        {/* Links section */}
        <div className="mt-5 pt-4 border-t">
          <label className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
            <LinkIcon className="w-3 h-3" /> Associated Links
          </label>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <input type="text" placeholder="Search links..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
            </div>
            <select className="input-base w-48 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddLink(parseInt(val)); e.target.value = ''; }} value="">
              <option value="">Add link...</option>
              {filteredLinks.map(link => <option key={`link-option-${link.id}`} value={link.id}>{link.name} ({link.linkType})</option>)}
            </select>
          </div>
          {testimonialLinks.length === 0 ? (
            <p className="text-xs italic">No links associated.</p>
          ) : (
            <div className="space-y-1 border rounded-lg p-2 bg-zinc-50">
              {testimonialLinks.map((tl, idx) => (
                <div key={`associated-link-${tl.linkId}-${idx}`} className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                  <GripVertical className="w-4 h-4 cursor-move" />
                  <div className="flex-1 text-sm truncate">{tl.link?.name}</div>
                  <div className="flex gap-1">
                    <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0}>↑</button>
                    <button onClick={() => moveLink(idx, 'down')} disabled={idx === testimonialLinks.length-1}>↓</button>
                    <button onClick={() => handleRemoveLink(tl.linkId)} className="text-red-500">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> {testimonial ? 'Update' : 'Create'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Testimonial View Modal (Gallery & Lightbox) – FIXED KEYS
// ============================================================
function TestimonialViewModal({
  testimonial,
  onClose,
}: {
  testimonial: TestimonialResponse;
  onClose: () => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const bannerImages = testimonial.bannerImages || [];

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-xl font-bold">Testimonial Details</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {testimonial.thumbImage ? (
                <img src={getMediaUrl(testimonial.thumbImage)} alt={testimonial.clientName} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                  {testimonial.clientName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">{testimonial.clientName}</p>
                <p className="text-sm text-zinc-500">
                  {testimonial.designationType} {testimonial.companyName && `at ${testimonial.companyName}`}
                </p>
              </div>
            </div>

            <div className="flex gap-0.5">
              {Array(5).fill(0).map((_, i) => (
                <Star key={`star-${i}`} className={cn('w-5 h-5', i < testimonial.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300')} />
              ))}
            </div>

            <div className="bg-zinc-50 rounded-xl p-4">
              <p className="text-sm italic">“{testimonial.review}”</p>
            </div>

            {bannerImages.length > 0 && (
              <div>
                <label className="text-xs font-semibold">Banner Images</label>
                <div className="grid grid-cols-2 gap-2">
                  {bannerImages.map((img, idx) => (
                    <div
                      key={`banner-${idx}`}
                      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => openLightbox(idx)}
                    >
                      <img src={getMediaUrl(img.media)} alt={`Banner ${idx+1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t">
              <p>Created: {formatDate(testimonial.createdAt)}</p>
              {testimonial.updatedAt !== testimonial.createdAt && <p>Updated: {formatDate(testimonial.updatedAt)}</p>}
              {testimonial.clientId && <p>Linked User ID: {testimonial.clientId}</p>}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <a href={`/testimonials/${testimonial.id}`} target="_blank" className="btn-primary flex-1 justify-center gap-2">
              <ExternalLink className="w-4 h-4" /> View Public
            </a>
          </div>
        </motion.div>
      </div>
      {/* Lightbox – unchanged */}
      {showLightbox && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={() => setShowLightbox(false)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setShowLightbox(false)}><X className="w-6 h-6" /></button>
          <button
            className="absolute left-4 text-white p-2 rounded-full hover:bg-white/20 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : bannerImages.length - 1)); }}
            disabled={bannerImages.length <= 1}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img src={getMediaUrl(bannerImages[currentImageIndex].media)} alt="full" className="max-w-[90vw] max-h-[90vh] object-contain" />
          <button
            className="absolute right-4 text-white p-2 rounded-full hover:bg-white/20 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % bannerImages.length); }}
            disabled={bannerImages.length <= 1}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================
// Main Admin Testimonials Page
// ============================================================
export default function AdminTestimonialsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; testimonial?: TestimonialResponse | null }>({ open: false });
  const [viewModal, setViewModal] = useState<TestimonialResponse | null>(null);
  const { data, isLoading, refetch } = useAdminTestimonials(page, 10);
  const { mutateAsync: deleteTestimonial } = useDeleteTestimonial();
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter(t =>
    t.clientName.toLowerCase().includes(search.toLowerCase()) ||
    (t.companyName && t.companyName.toLowerCase().includes(search.toLowerCase())) ||
    t.review.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableTestimonial(id);
      else await adminApi.enableTestimonial(id);
      toast.success(active ? 'Disabled' : 'Enabled');
      await qc.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete testimonial from "${name}"?`)) return;
    try {
      await deleteTestimonial(id);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <TestimonialModal testimonial={modal.testimonial} onClose={() => setModal({ open: false })} />}
        {viewModal && <TestimonialViewModal testimonial={viewModal} onClose={() => setViewModal(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Testimonials</h1>
          <p className="text-sm text-zinc-500">{data?.totalElements ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal({ open: true, testimonial: null })} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Testimonial</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input className="input-base pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">Client</th>
                <th>Company</th><th>Rating</th><th>Review</th><th>Featured</th><th>Status</th><th>Created</th><th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
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
                  <td colSpan={8} className="text-center py-12">No testimonials found.</td>
                </tr>
              ) : (
                filtered.map(t => (
                  <motion.tr key={`testimonial-row-${t.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-100">
                          {t.thumbImage ? <img src={getMediaUrl(t.thumbImage)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">{t.clientName.charAt(0)}</div>}
                        </div>
                        <div><p className="text-sm font-semibold">{t.clientName}</p><p className="text-xs text-zinc-400">{t.designationType}</p></div>
                      </div>
                    </td>
                    <td className="text-sm">{t.companyName || '—'}</td>
                    <td><div className="flex gap-0.5">{Array(5).fill(0).map((_, i) => <Star key={`star-${i}`} className={cn('w-3.5 h-3.5', i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300')} />)}</div></td>
                    <td className="text-xs text-zinc-500 max-w-[200px] truncate">{t.review}</td>
                    <td>{t.featured ? <span className="badge-amber text-xs">Featured</span> : '—'}</td>
                    <td><span className={cn('text-xs px-2 py-0.5 rounded-full', t.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100')}>{t.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-xs">{t.createdAt ? formatDate(t.createdAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewModal(t)} className="p-1.5 rounded-lg hover:bg-zinc-100"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ open: true, testimonial: t })} className="p-1.5 rounded-lg hover:bg-zinc-100"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleToggle(t.id, t.active)} className="p-1.5 rounded-lg">{t.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        <button onClick={() => handleDelete(t.id, t.clientName)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        <a href={`/testimonials/${t.id}`} target="_blank" className="p-1.5 rounded-lg hover:bg-brand-50"><ExternalLink className="w-4 h-4" /></a>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-xs">Page {(data.number ?? 0) + 1} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={data.number === 0} className="p-2 rounded-lg border disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => p+1)} disabled={data.last} className="p-2 rounded-lg border disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}