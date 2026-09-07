'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Star, StarOff, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, Link as LinkIcon, Cpu, ListChecks,
  Search, RefreshCw, ExternalLink, GripVertical
} from 'lucide-react';
import { useAdminServices, useAdminLinks, useAdminTechnologies, useAdminFeatures, useDeleteService } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { getMediaUrl } from '@/lib/cdn';;
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { ServiceResponse, LinkResponse, TechnologyResponse, FeatureResponse } from '@/types';

// ============================================================
// Service Modal (Create / Edit) – fixed for correct field mapping
// ============================================================
function ServiceModal({
  service,
  onClose,
}: {
  service?: ServiceResponse | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: allLinks } = useAdminLinks(0, 100);
  const { data: allTechnologies } = useAdminTechnologies(0, 100);
  const { data: allFeatures } = useAdminFeatures(0, 100);

  // Basic fields
  const [name, setName] = useState(service?.name ?? '');
  const [slug, setSlug] = useState(service?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(service?.shortDescription ?? '');
  const [longDescription, setLongDescription] = useState(service?.longDescription ?? '');
  const [displayOrder, setDisplayOrder] = useState(service?.displayOrder ?? 0);
  const [featured, setFeatured] = useState(service?.featured ?? false);
  const [active, setActive] = useState(service?.active ?? true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    service?.iconImage?.optimizedKey || null
  );
  const [removeImage, setRemoveImage] = useState(false);

  // ✅ Links – map from backend response (field name is 'links')
  const [serviceLinks, setServiceLinks] = useState<
    { linkId: number; displayOrder: number; link?: LinkResponse }[]
  >(() => {
    if (service?.serviceLinks && Array.isArray(service.serviceLinks)) {
      return service.serviceLinks.map((sl, idx) => ({
        linkId: sl.link.id,
        displayOrder: sl.displayOrder ?? idx,
        link: sl.link,
      }));
    }
    return [];
  });
  const [linkSearch, setLinkSearch] = useState('');

  // ✅ Technologies – field name is 'technologies'
  const [serviceTechnologies, setServiceTechnologies] = useState<
    { technologyId: number; displayOrder: number; technology?: TechnologyResponse }[]
  >(() => {
    if (service?.technologies && Array.isArray(service.technologies)) {
      return service.technologies.map((st, idx) => ({
        technologyId: st.technology.id,
        displayOrder: st.displayOrder ?? idx,
        technology: st.technology,
      }));
    }
    return [];
  });
  const [techSearch, setTechSearch] = useState('');

  // ✅ Features – field name is 'features'
  const [serviceFeatures, setServiceFeatures] = useState<
    { featureId: number; displayOrder: number; highlighted: boolean; feature?: FeatureResponse }[]
  >(() => {
    if (service?.features && Array.isArray(service.features)) {
      return service.features.map((sf, idx) => ({
        featureId: sf.feature.id,
        displayOrder: sf.displayOrder ?? idx,
        highlighted: sf.highlighted ?? false,
        feature: sf.feature,
      }));
    }
    return [];
  });
  const [featureSearch, setFeatureSearch] = useState('');

  const [saving, setSaving] = useState(false);

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

  // Link handlers
  const handleAddLink = (linkId: number) => {
    const link = allLinks?.content?.find(l => l.id === linkId);
    if (!link) return;
    if (serviceLinks.some(sl => sl.linkId === linkId)) {
      toast.error('Link already added');
      return;
    }
    setServiceLinks(prev => [...prev, { linkId, displayOrder: prev.length, link }]);
  };
  const handleRemoveLink = (linkId: number) => {
    setServiceLinks(prev => prev.filter(sl => sl.linkId !== linkId));
  };
  const moveLink = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === serviceLinks.length - 1) return;
    const newLinks = [...serviceLinks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];
    setServiceLinks(newLinks);
  };
  const filteredLinks = allLinks?.content?.filter(l =>
    l.name.toLowerCase().includes(linkSearch.toLowerCase()) ||
    l.url.toLowerCase().includes(linkSearch.toLowerCase())
  ) ?? [];

  // Technology handlers
  const handleAddTechnology = (technologyId: number) => {
    const tech = allTechnologies?.content?.find(t => t.id === technologyId);
    if (!tech) return;
    if (serviceTechnologies.some(st => st.technologyId === technologyId)) {
      toast.error('Technology already added');
      return;
    }
    setServiceTechnologies(prev => [...prev, { technologyId, displayOrder: prev.length, technology: tech }]);
  };
  const handleRemoveTechnology = (technologyId: number) => {
    setServiceTechnologies(prev => prev.filter(st => st.technologyId !== technologyId));
  };
  const moveTechnology = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === serviceTechnologies.length - 1) return;
    const newTechs = [...serviceTechnologies];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTechs[index], newTechs[swapIndex]] = [newTechs[swapIndex], newTechs[index]];
    setServiceTechnologies(newTechs);
  };
  const filteredTechnologies = allTechnologies?.content?.filter(t =>
    t.name.toLowerCase().includes(techSearch.toLowerCase())
  ) ?? [];

  // Feature handlers
  const handleAddFeature = (featureId: number) => {
    const feature = allFeatures?.content?.find(f => f.id === featureId);
    if (!feature) return;
    if (serviceFeatures.some(sf => sf.featureId === featureId)) {
      toast.error('Feature already added');
      return;
    }
    setServiceFeatures(prev => [...prev, { featureId, displayOrder: prev.length, highlighted: false, feature }]);
  };
  const handleRemoveFeature = (featureId: number) => {
    setServiceFeatures(prev => prev.filter(sf => sf.featureId !== featureId));
  };
  const moveFeature = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === serviceFeatures.length - 1) return;
    const newFeatures = [...serviceFeatures];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newFeatures[index], newFeatures[swapIndex]] = [newFeatures[swapIndex], newFeatures[index]];
    setServiceFeatures(newFeatures);
  };
  const toggleHighlight = (index: number) => {
    setServiceFeatures(prev => prev.map((sf, i) => i === index ? { ...sf, highlighted: !sf.highlighted } : sf));
  };
  const filteredFeatures = allFeatures?.content?.filter(f =>
    f.name.toLowerCase().includes(featureSearch.toLowerCase())
  ) ?? [];

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (!shortDescription.trim()) {
      toast.error('Short description is required');
      return;
    }
    if (!service && !imageFile) {
      toast.error('Icon image is required for new services');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      // Build JSON payload (field names match backend ServiceRequest)
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim() || undefined,
        displayOrder: Number(displayOrder),
        featured,
        active,
        serviceLinks: serviceLinks.map((sl, idx) => ({
          linkId: sl.linkId,
          displayOrder: idx,
        })),
        technologies: serviceTechnologies.map((st, idx) => ({
          technologyId: st.technologyId,
          displayOrder: idx,
        })),
        features: serviceFeatures.map((sf, idx) => ({
          featureId: sf.featureId,
          displayOrder: idx,
          highlighted: sf.highlighted,
        })),
      };

      formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      if (imageFile) formData.append('iconImageFile', imageFile);
      if (removeImage) formData.append('removeImage', 'true');

      if (service) {
        await adminApi.updateService(service.id, formData);
        toast.success('Service updated');
      } else {
        await adminApi.createService(formData);
        toast.success('Service created');
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err?.response?.data?.message || 'Failed to save service');
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
          {service ? 'Edit Service' : 'Create Service'}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Name *</label>
              <input className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Web Development" />
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
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Icon Image {!service && '*'}</label>
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
                  {service?.iconImage && !imageFile && !removeImage && (
                    <p className="flex items-center gap-1 text-amber-600"><AlertCircle className="w-3 h-3" /> Current icon will be kept</p>
                  )}
                  {removeImage && <p className="flex items-center gap-1 text-red-500"><Trash2 className="w-3 h-3" /> Icon will be removed</p>}
                  {imageFile && <p className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> New icon selected</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column – Associations */}
          <div className="space-y-5">
            {/* Links */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Associated Links
              </label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search links..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                </div>
                <select className="input-base w-40 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddLink(parseInt(val)); e.target.value = ''; }} value="">
                  <option value="">Add link...</option>
                  {filteredLinks.map(link => <option key={link.id} value={link.id}>{link.name}</option>)}
                </select>
              </div>
              {serviceLinks.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No links associated.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/30">
                  {serviceLinks.map((sl, idx) => (
                    <div key={sl.linkId} className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-800 rounded shadow-sm">
                      <GripVertical className="w-4 h-4 text-zinc-400 cursor-move" />
                      <div className="flex-1 text-sm truncate">{sl.link?.name}</div>
                      <div className="flex gap-1">
                        <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-zinc-100 disabled:opacity-30">↑</button>
                        <button onClick={() => moveLink(idx, 'down')} disabled={idx === serviceLinks.length-1} className="p-0.5 hover:bg-zinc-100 disabled:opacity-30">↓</button>
                        <button onClick={() => handleRemoveLink(sl.linkId)} className="p-0.5 hover:bg-red-50 text-red-500"><X className="w-3 h-3" /></button>
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
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                </div>
                <select className="input-base w-40 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddTechnology(parseInt(val)); e.target.value = ''; }} value="">
                  <option value="">Add technology...</option>
                  {filteredTechnologies.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                </select>
              </div>
              {serviceTechnologies.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No technologies associated.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/30">
                  {serviceTechnologies.map((st, idx) => (
                    <div key={st.technologyId} className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-800 rounded shadow-sm">
                      <GripVertical className="w-4 h-4 text-zinc-400" />
                      <div className="flex-1 text-sm truncate">{st.technology?.name}</div>
                      <div className="flex gap-1">
                        <button onClick={() => moveTechnology(idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-zinc-100">↑</button>
                        <button onClick={() => moveTechnology(idx, 'down')} disabled={idx === serviceTechnologies.length-1} className="p-0.5 hover:bg-zinc-100">↓</button>
                        <button onClick={() => handleRemoveTechnology(st.technologyId)} className="p-0.5 hover:bg-red-50 text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Features */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-2 block flex items-center gap-1">
                <ListChecks className="w-3 h-3" /> Features
              </label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search features..." value={featureSearch} onChange={e => setFeatureSearch(e.target.value)} className="input-base py-2 pl-8 text-sm" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                </div>
                <select className="input-base w-40 text-sm" onChange={e => { const val = e.target.value; if (val) handleAddFeature(parseInt(val)); e.target.value = ''; }} value="">
                  <option value="">Add feature...</option>
                  {filteredFeatures.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              {serviceFeatures.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No features associated.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/30">
                  {serviceFeatures.map((sf, idx) => (
                    <div key={sf.featureId} className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-800 rounded shadow-sm">
                      <GripVertical className="w-4 h-4 text-zinc-400" />
                      <div className="flex-1 text-sm truncate">{sf.feature?.name}</div>
                      <button onClick={() => toggleHighlight(idx)} className={cn('text-xs px-1.5 py-0.5 rounded', sf.highlighted ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500')}>
                        {sf.highlighted ? '★ Highlighted' : 'Highlight'}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => moveFeature(idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-zinc-100">↑</button>
                        <button onClick={() => moveFeature(idx, 'down')} disabled={idx === serviceFeatures.length-1} className="p-0.5 hover:bg-zinc-100">↓</button>
                        <button onClick={() => handleRemoveFeature(sf.featureId)} className="p-0.5 hover:bg-red-50 text-red-500"><X className="w-3 h-3" /></button>
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
            {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span> : <><CheckCircle2 className="w-4 h-4" /> {service ? 'Update Service' : 'Create Service'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Service View Modal (Quick View)
// ============================================================
function ServiceViewModal({
  service,
  onClose,
}: {
  service: ServiceResponse;
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
          <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">{service.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            {service.iconImage && <img src={getMediaUrl(service.iconImage)} alt={service.name} className="w-16 h-16 rounded-lg object-cover" />}
            <div>
              <p className="text-sm text-zinc-500">Slug: <span className="font-mono">{service.slug}</span></p>
              <p className="text-sm text-zinc-500">Display Order: {service.displayOrder}</p>
              <div className="flex gap-2 mt-1">
                {service.featured && <span className="badge-amber text-xs">Featured</span>}
                <span className={cn('text-xs px-2 py-0.5 rounded-full', service.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500')}>
                  {service.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500">Short Description</label>
            <p className="text-sm mt-1">{service.shortDescription}</p>
          </div>
          {service.longDescription && (
            <div>
              <label className="text-xs font-semibold text-zinc-500">Full Description</label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{service.longDescription}</p>
            </div>
          )}

          {service.serviceLinks && service.serviceLinks.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Links</label>
              <div className="mt-1 space-y-1">
                {service.serviceLinks.map(sl => (
                  <a key={sl.id} href={sl.link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-500 hover:underline block truncate">
                    {sl.link.name} – {sl.link.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {service.technologies && service.technologies.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1"><Cpu className="w-3 h-3" /> Technologies</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {service.technologies.map(st => (
                  <span key={st.id} className="badge-zinc text-xs">{st.technology.name}</span>
                ))}
              </div>
            </div>
          )}

          {service.features && service.features.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 flex items-center gap-1"><ListChecks className="w-3 h-3" /> Features</label>
              <div className="space-y-2 mt-1">
                {service.features.map(sf => (
                  <div key={sf.id} className="flex items-start gap-2">
                    {sf.highlighted && <Star className="w-3 h-3 text-amber-500 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium">{sf.feature.name}</p>
                      {sf.feature.description && <p className="text-xs text-zinc-500">{sf.feature.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-zinc-400 border-t pt-2">
            Created: {formatDate(service.createdAt)} | Updated: {formatDate(service.updatedAt)}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <a href={`/services/${service.slug}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> View Public Page
          </a>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Admin Services Page
// ============================================================
export default function AdminServicesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; service?: ServiceResponse | null }>({ open: false });
  const [viewModal, setViewModal] = useState<ServiceResponse | null>(null);
  const { data, isLoading, refetch } = useAdminServices(page, 10);
  const { mutateAsync: deleteService } = useDeleteService();
  const qc = useQueryClient();

  const filtered = (data?.content ?? []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.shortDescription.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      if (active) await adminApi.disableService(id);
      else await adminApi.enableService(id);
      toast.success(active ? 'Service disabled' : 'Service enabled');
      await qc.invalidateQueries({ queryKey: ['admin', 'services'] });
    } catch { toast.error('Failed to update status'); }
  };

  const handleToggleFeatured = async (id: number, featured: boolean) => {
    try {
      if (featured) await adminApi.unfeatureService(id);
      else await adminApi.featureService(id);
      toast.success(featured ? 'Removed from featured' : 'Marked as featured');
      await qc.invalidateQueries({ queryKey: ['admin', 'services'] });
    } catch { toast.error('Failed to update featured status'); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete service "${name}"? This cannot be undone.`)) return;
    try {
      await deleteService(id);
      toast.success('Service deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {modal.open && <ServiceModal service={modal.service} onClose={() => setModal({ open: false })} />}
        {viewModal && <ServiceViewModal service={viewModal} onClose={() => setViewModal(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Services</h1>
          <p className="text-sm text-zinc-500 mt-1">{data?.totalElements ?? '—'} total services</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal({ open: true, service: null })} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Service</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input className="input-base pl-9" placeholder="Search by name or short description..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Icon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name / Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Features</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Techs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Featured</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(8).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400">
                    {search ? `No services matching "${search}"` : 'No services yet. Create your first one.'}
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {s.iconImage ? (
                        <img src={getMediaUrl(s.iconImage)} alt={s.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {s.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.name}</p>
                      <p className="text-xs text-zinc-400 truncate max-w-[200px]">{s.shortDescription}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{s.slug}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{s.features?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{s.technologies?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleFeatured(s.id, s.featured)}
                        className={cn('p-1.5 rounded-lg transition-colors',
                          s.featured ? 'text-amber-500 hover:bg-amber-50' : 'text-zinc-300 hover:text-amber-500 hover:bg-amber-50'
                        )}>
                        {s.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                        s.active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewModal(s)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" title="Quick View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModal({ open: true, service: s })} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(s.id, s.active)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400" title={s.active ? 'Disable' : 'Enable'}>
                          {s.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <a href={`/services/${s.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-brand-50 text-zinc-400 hover:text-brand-500" title="Public Page">
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