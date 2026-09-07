'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Search, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, Link as LinkIcon, Cpu,
  ExternalLink, RefreshCw, Image as ImageIcon, Maximize2, GripVertical
} from 'lucide-react';
import { useAdminProjects, useAdminLinks, useAdminTechnologies, useAdminBundles, useDeleteProject } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ProjectResponse, LinkResponse, TechnologyResponse, ProjectBannerImageResponse,
} from '@/types';

const DELIVERABLE_TYPES = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'ANDROID_APP', label: 'Android App' },
  { value: 'IOS_APP', label: 'iOS App' },
  { value: 'ADMIN_PANEL', label: 'Admin Panel' },
  { value: 'API_BACKEND', label: 'API Backend' },
];

// ============================================================
// Project Modal (Create / Edit) – with all keys fixed
// ============================================================
function ProjectModal({
  project,
  onClose,
}: {
  project?: ProjectResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: allLinks } = useAdminLinks(0, 100);
  const { data: allTechnologies } = useAdminTechnologies(0, 100);
  const { data: allBundles } = useAdminBundles(0, 100);

  // Basic fields
  const [title, setTitle] = useState(project?.title ?? '');
  const [slug, setSlug] = useState(project?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(project?.shortDescription ?? '');
  const [fullDescription, setFullDescription] = useState(project?.fullDescription ?? '');
  const [deliverableType, setDeliverableType] = useState(project?.projectDeliverableType ?? 'WEBSITE');
  const [featured, setFeatured] = useState(project?.featured ?? false);
  const [active, setActive] = useState(project?.active ?? true);
  const [bundleId, setBundleId] = useState(project?.projectBundle?.projectBundleId?.toString() ?? '');

  // Thumbnail
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(
    project?.thumbImage?.optimizedKey || null
  );
  const [removeThumb, setRemoveThumb] = useState(false);

  // Banner images – using ProjectBannerImageResponse structure
  const [existingBanners, setExistingBanners] = useState<ProjectBannerImageResponse[]>(
    project?.bannerImages || []
  );
  const [newBannerFiles, setNewBannerFiles] = useState<File[]>([]);
  const [newBannerPreviews, setNewBannerPreviews] = useState<string[]>([]);
  const [removeBannerIds, setRemoveBannerIds] = useState<number[]>([]);

  // External links — same local shape style as Packages' `packageServices`:
  // keeps the full nested object for display AND the join-row `mappingId`
  // needed to call the dedicated remove endpoint.
  const [externalLinks, setExternalLinks] = useState<
    { linkId: number; displayOrder: number; link: LinkResponse; mappingId?: number }[]
  >(() => {
    if (project?.externalLinks) {
      return project.externalLinks
        .map((el) => {
          if (!el.link?.id) return null;
          return {
            linkId: el.link.id,
            displayOrder: el.displayOrder ?? 0,
            link: el.link,
            mappingId: el.id,
          };
        })
        .filter(Boolean) as { linkId: number; displayOrder: number; link: LinkResponse; mappingId: number }[];
    }
    return [];
  });
  const [linkSearch, setLinkSearch] = useState('');
  const [loadingLinks, setLoadingLinks] = useState(false);

  // Technologies — same pattern as External Links above.
  const [projectTechnologies, setProjectTechnologies] = useState<
    { technologyId: number; displayOrder: number; technology: TechnologyResponse; mappingId?: number }[]
  >(() => {
    if (project?.technologies) {
      return project.technologies
        .map((pt) => {
          if (!pt.technology?.id) return null;
          return {
            technologyId: pt.technology.id,
            displayOrder: pt.displayOrder ?? 0,
            technology: pt.technology,
            mappingId: pt.id,
          };
        })
        .filter(Boolean) as { technologyId: number; displayOrder: number; technology: TechnologyResponse; mappingId: number }[];
    }
    return [];
  });
  const [techSearch, setTechSearch] = useState('');
  const [loadingTechnologies, setLoadingTechnologies] = useState(false);

  const [saving, setSaving] = useState(false);

  // Refresh just the Technologies/Links portion of the project from the
  // backend and replace local state wholesale — same as Packages'
  // refreshPackage(). Also invalidates the admin table query so the
  // Technologies/Links count shown in the row behind the modal stays
  // in sync even while the modal is still open.
  const refreshProjectAssociations = async () => {
    if (!project?.id) return;
    try {
      const res = await adminApi.getProjectById(project.id);
      const fresh = res.data.data;
      if (fresh?.technologies) {
        const mappedTechs = fresh.technologies
          .map((pt) => {
            if (!pt.technology?.id) return null;
            return {
              technologyId: pt.technology.id,
              displayOrder: pt.displayOrder ?? 0,
              technology: pt.technology,
              mappingId: pt.id,
            };
          })
          .filter(Boolean) as { technologyId: number; displayOrder: number; technology: TechnologyResponse; mappingId: number }[];
        setProjectTechnologies(mappedTechs);
      }
      if (fresh?.externalLinks) {
        const mappedLinks = fresh.externalLinks
          .map((el) => {
            if (!el.link?.id) return null;
            return {
              linkId: el.link.id,
              displayOrder: el.displayOrder ?? 0,
              link: el.link,
              mappingId: el.id,
            };
          })
          .filter(Boolean) as { linkId: number; displayOrder: number; link: LinkResponse; mappingId: number }[];
        setExternalLinks(mappedLinks);
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
    } catch (err) {
      console.error('Failed to refresh project:', err);
    }
  };

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

  // Banner handlers
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

  // External links handlers
  const handleAddLink = (linkId: number) => {
    const link = allLinks?.content?.find(l => l.id === linkId);
    if (!link) return;
    if (externalLinks.some(el => el.linkId === linkId)) {
      toast.error('Link already added');
      return;
    }
    setExternalLinks(prev => [...prev, { linkId, displayOrder: prev.length, link }]);
  };
  const handleRemoveLink = (linkId: number) => {
    setExternalLinks(prev => prev.filter(el => el.linkId !== linkId));
  };
  const moveLink = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === externalLinks.length - 1) return;
    const newLinks = [...externalLinks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];
    setExternalLinks(newLinks);
  };
  const filteredLinks = allLinks?.content?.filter(l =>
    l.name.toLowerCase().includes(linkSearch.toLowerCase()) ||
    l.url.toLowerCase().includes(linkSearch.toLowerCase())
  ) ?? [];

  // Technologies handlers
  const handleAddTechnology = (technologyId: number) => {
    const tech = allTechnologies?.content?.find(t => t.id === technologyId);
    if (!tech) return;
    if (projectTechnologies.some(pt => pt.technologyId === technologyId)) {
      toast.error('Technology already added');
      return;
    }
    setProjectTechnologies(prev => [...prev, { technologyId, displayOrder: prev.length, technology: tech }]);
  };
  const handleRemoveTechnology = (technologyId: number) => {
    setProjectTechnologies(prev => prev.filter(pt => pt.technologyId !== technologyId));
  };
  const moveTechnology = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === projectTechnologies.length - 1) return;
    const newTechs = [...projectTechnologies];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTechs[index], newTechs[swapIndex]] = [newTechs[swapIndex], newTechs[index]];
    setProjectTechnologies(newTechs);
  };
  const filteredTechnologies = allTechnologies?.content?.filter(t =>
    t.name.toLowerCase().includes(techSearch.toLowerCase())
  ) ?? [];

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Project title is required');
      return;
    }
    if (!shortDescription.trim()) {
      toast.error('Short description is required');
      return;
    }
    if (!project && !thumbFile) {
      toast.error('Thumbnail image is required for new projects');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      const payload: any = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim() || undefined,
        deliverableType,
        featured,
        active,
        externalLinks: externalLinks.map((el, idx) => ({
          linkId: el.linkId,
          displayOrder: idx,
        })),
        technologies: projectTechnologies.map((pt, idx) => ({
          technologyId: pt.technologyId,
          displayOrder: idx,
        })),
      };
      if (bundleId) payload.projectBundle = { projectBundleId: Number(bundleId) };
      if (project && removeBannerIds.length) payload.removeBannerIds = removeBannerIds;

      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      if (thumbFile) formData.append('thumbImageFile', thumbFile);
      if (removeThumb) formData.append('removeThumb', 'true');
      newBannerFiles.forEach(file => formData.append('bannerImageFiles', file));

      if (project) {
        await adminApi.updateProject(project.id, formData);
        toast.success('Project updated');
      } else {
        await adminApi.createProject(formData);
        toast.success('Project created');
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save project');
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
        <h3 className="font-display text-xl font-bold mb-5">
          {project ? 'Edit Project' : 'Create Project'}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Title *</label>
              <input className="input-base" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Ecom Mobile App" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Slug (optional)</label>
              <input className="input-base" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated from title" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Short Description *</label>
              <textarea className="input-base resize-none" rows={2} value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Full Description</label>
              <textarea className="input-base resize-none" rows={3} value={fullDescription} onChange={e => setFullDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Deliverable Type *</label>
              <select className="input-base" value={deliverableType} onChange={e => setDeliverableType(e.target.value)}>
                {DELIVERABLE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
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
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Project Bundle (optional)</label>
              <select className="input-base" value={bundleId} onChange={e => setBundleId(e.target.value)}>
                <option value="">None</option>
                {allBundles?.content?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Thumbnail Image {!project && '*'}</label>
              <div className="flex items-start gap-3">
                {thumbPreview ? (
                  <div key="thumb-preview" className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={thumbPreview} alt="Thumb" className="w-full h-full object-cover" />
                    <button onClick={handleRemoveThumb} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label key="thumb-upload" className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer hover:border-brand-400">
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px]">Upload</span>
                    <input type="file" accept="image/*" onChange={handleThumbChange} className="hidden" />
                  </label>
                )}
                <div className="flex-1 text-xs">
                  {project?.thumbImage && !thumbFile && !removeThumb && (
                    <p className="text-amber-600 flex gap-1"><AlertCircle className="w-3 h-3" /> Current thumb will be kept</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Banner Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {/* Existing banners – key by id, fallback to index */}
                {existingBanners.map((b, idx) => (
                  <div key={b.id ?? `existing-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={b.media?.optimizedKey || ''} alt="Banner" className="w-full h-full object-cover" />
                    <button onClick={() => removeExistingBanner(b.id)} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* New banners – temporary keys */}
                {newBannerPreviews.map((preview, idx) => (
                  <div key={`new-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={preview} alt="New" className="w-full h-full object-cover" />
                    <button onClick={() => removeNewBanner(idx)} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label key="add-banner" className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer hover:border-brand-400">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px]">Add</span>
                  <input type="file" accept="image/*" multiple onChange={handleBannerChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-zinc-400">Recommended: 1200×800px. Multiple allowed.</p>
            </div>
          </div>

          {/* Right column – Associations */}
          <div className="space-y-5">
            {/* External Links */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> External Links
              </label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search links..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                </div>
                <select className="input-base w-48 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddLink(parseInt(val)); e.target.value = ''; }} value="">
                  <option value="">Add link...</option>
                  {filteredLinks.map(link => <option key={link.id} value={link.id}>{link.name}</option>)}
                </select>
              </div>
              {externalLinks.length === 0 ? (
                <p className="text-xs italic">No external links.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50">
                  {externalLinks.map((el, idx) => (
                    <div key={el.linkId ?? idx} className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                      <GripVertical className="w-4 h-4 cursor-move" />
                      <div className="flex-1 text-sm truncate">{el.link?.name}</div>
                      <div className="flex gap-1">
                        <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0}>↑</button>
                        <button onClick={() => moveLink(idx, 'down')} disabled={idx === externalLinks.length-1}>↓</button>
                        <button onClick={() => handleRemoveLink(el.linkId)} className="text-red-500">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Technologies */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Technologies
              </label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search technologies..." value={techSearch} onChange={e => setTechSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                </div>
                <select className="input-base w-48 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddTechnology(parseInt(val)); e.target.value = ''; }} value="">
                  <option value="">Add technology...</option>
                  {filteredTechnologies.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                </select>
              </div>
              {projectTechnologies.length === 0 ? (
                <p className="text-xs italic">No technologies.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50">
                  {projectTechnologies.map((pt, idx) => (
                    <div key={pt.technologyId ?? idx} className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                      <GripVertical className="w-4 h-4 cursor-move" />
                      <div className="flex-1 text-sm truncate">{pt.technology?.name}</div>
                      <div className="flex gap-1">
                        <button onClick={() => moveTechnology(idx, 'up')} disabled={idx === 0}>↑</button>
                        <button onClick={() => moveTechnology(idx, 'down')} disabled={idx === projectTechnologies.length-1}>↓</button>
                        <button onClick={() => handleRemoveTechnology(pt.technologyId)} className="text-red-500">✕</button>
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
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> {project ? 'Update' : 'Create'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Project View Modal (Quick View) – with keys
// ============================================================
function ProjectViewModal({
  project,
  onClose,
}: {
  project: ProjectResponse;
  onClose: () => void;
}) {
  const [currentImage, setCurrentImage] = useState<number | null>(null);
  const bannerImages = project.bannerImages || [];

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
            <h3 className="font-display text-xl font-bold">{project.title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              {project.thumbImage && <img src={getMediaUrl(project.thumbImage)} alt={project.title} className="w-16 h-16 rounded-lg object-cover" />}
              <div>
                <p className="text-sm text-zinc-500">Slug: <span className="font-mono">{project.slug}</span></p>
                <p className="text-sm text-zinc-500">Type: {project.projectDeliverableType}</p>
                {project.projectBundle && <p className="text-sm text-zinc-500">Bundle: {project.projectBundle.projectBundleName}</p>}
                <div className="flex gap-2 mt-1">
                  {project.featured && <span className="badge-amber text-xs">Featured</span>}
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', project.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100')}>
                    {project.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Short Description</label>
              <p className="text-sm mt-1">{project.shortDescription}</p>
            </div>
            {project.fullDescription && (
              <div>
                <label className="text-xs font-semibold">Full Description</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{project.fullDescription}</p>
              </div>
            )}

            {project.externalLinks && project.externalLinks.length > 0 && (
              <div>
                <label className="text-xs font-semibold flex gap-1"><LinkIcon className="w-3 h-3" /> External Links</label>
                <div className="mt-1 space-y-1">
                  {project.externalLinks.map(externalLink => (
                    <a key={externalLink.id} href={externalLink.link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-500 hover:underline block truncate">
                      {externalLink.link.name} – {externalLink.link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {project.technologies && project.technologies.length > 0 && (
              <div>
                <label className="text-xs font-semibold flex gap-1"><Cpu className="w-3 h-3" /> Technologies</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {project.technologies.map(pt => (
                    <span key={pt.id} className="badge-zinc text-xs">{pt.technology.name}</span>
                  ))}
                </div>
              </div>
            )}

            {bannerImages.length > 0 && (
              <div>
                <label className="text-xs font-semibold">Banner Images</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {bannerImages.map((img, idx) => (
                    <div
                      key={img.id ?? idx}
                      className="aspect-video rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setCurrentImage(idx)}
                    >
                      <img src={getMediaUrl(img.media)} alt="banner" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-zinc-400 border-t pt-2">
              Created: {formatDate(project.createdAt)} | Updated: {formatDate(project.updatedAt)}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <a href={`/projects/${project.slug}`} target="_blank" className="btn-primary flex-1 justify-center gap-2">
              <ExternalLink className="w-4 h-4" /> View Public
            </a>
          </div>
        </motion.div>
      </div>
      {/* Lightbox */}
      {currentImage !== null && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={() => setCurrentImage(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setCurrentImage(null)}><X className="w-6 h-6" /></button>
          <img src={getMediaUrl(bannerImages[currentImage].media)} alt="full" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}
    </>
  );
}

// ============================================================
// Main Admin Projects Page
// ============================================================
export default function AdminProjectsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; project?: ProjectResponse | null }>({ open: false });
  const [viewModal, setViewModal] = useState<ProjectResponse | null>(null);
  const { data, isLoading, refetch } = useAdminProjects(page, 10);
  const { mutateAsync: deleteProject } = useDeleteProject();
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.shortDescription.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableProject(id);
      else await adminApi.enableProject(id);
      toast.success(active ? 'Disabled' : 'Enabled');
      await qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete project "${title}"?`)) return;
    try {
      await deleteProject(id);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <ProjectModal project={modal.project} onClose={() => setModal({ open: false })} />}
        {viewModal && <ProjectViewModal project={viewModal} onClose={() => setViewModal(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Projects</h1>
          <p className="text-sm text-zinc-500">{data?.totalElements ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal({ open: true, project: null })} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Project</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input className="input-base pl-9" placeholder="Search by title or description..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">Thumb</th>
                <th>Title</th>
                <th>Type</th>
                <th>Technologies</th>
                <th>Featured</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-center">Actions</th>
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
                  <td colSpan={8} className="text-center py-12">No projects found.</td>
                </tr>
              ) : (
                filtered.map(p => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100">
                        {p.thumbImage ? (
                          <img src={getMediaUrl(p.thumbImage)} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">{p.title.charAt(0)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-zinc-400 truncate max-w-xs">{p.shortDescription}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100">{p.projectDeliverableType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {p.technologies?.slice(0,2).map(pt => (
                          <span key={pt.id} className="text-xs px-1.5 py-0.5 rounded bg-brand-50">{pt.technology.name}</span>
                        ))}
                        {(p.technologies?.length ?? 0) > 2 && <span className="text-xs">+{p.technologies.length-2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.featured ? <span className="badge-amber text-xs">Featured</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100')}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-xs">{p.createdAt ? formatDate(p.createdAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewModal(p)} className="p-1.5 rounded-lg hover:bg-zinc-100" title="Quick View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModal({ open: true, project: p })} className="p-1.5 rounded-lg hover:bg-zinc-100" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(p.id, p.active)} className="p-1.5 rounded-lg" title={p.active ? 'Disable' : 'Enable'}>
                          {p.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(p.id, p.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <a href={`/projects/${p.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-brand-50" title="View Public">
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
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-xs">Page {(data.number ?? 0) + 1} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p-1))}
                disabled={data.number === 0}
                className="p-2 rounded-lg border disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p+1)}
                disabled={data.last}
                className="p-2 rounded-lg border disabled:opacity-40"
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