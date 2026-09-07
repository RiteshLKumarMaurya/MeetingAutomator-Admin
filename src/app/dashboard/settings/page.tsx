'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertTriangle, Upload, X, Calendar } from 'lucide-react';
import { useAdminSettings, useUpdateAdminSettings } from '@/hooks/useApi';
import { getMediaUrl } from '@/lib/cdn';;
import toast from 'react-hot-toast';
import type { TechnicalIssueHandleSettingResponse } from '@/types';

export default function AdminSettingsPage() {
  const { data: settings, isLoading: loadingSettings } = useAdminSettings();
  const { mutateAsync: updateSettings, isPending: savingSettings } = useUpdateAdminSettings();

  // Technical issue form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [waitFrom, setWaitFrom] = useState('');
  const [waitUntil, setWaitUntil] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<TechnicalIssueHandleSettingResponse['image'] | null>(null);

  // Load settings into form
  useEffect(() => {
    if (settings?.technicalIssueSetting) {
      const tech = settings.technicalIssueSetting;
      setTitle(tech.title || '');
      setDescription(tech.description || '');
      setWaitFrom(tech.waitFrom ? tech.waitFrom.slice(0, 16) : '');
      setWaitUntil(tech.waitUntil ? tech.waitUntil.slice(0, 16) : '');
      setExistingImage(tech.image || null);
      if (tech.image?.optimizedKey) {
        setImagePreview(tech.image.optimizedKey);
      }
    }
  }, [settings]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveNewImage = () => {
    setImageFile(null);
    setImagePreview(existingImage?.optimizedKey || null);
  };

  const handleSaveTechnicalIssue = async () => {
    const formData = new FormData();
    if (title.trim()) formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());
    if (waitFrom) formData.append('waitFrom', new Date(waitFrom).toISOString());
    if (waitUntil) formData.append('waitUntil', new Date(waitUntil).toISOString());
    if (imageFile) formData.append('imageFile', imageFile);

    try {
      await updateSettings(formData);
      toast.success('Technical issue settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Configure technical issue banner</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-base p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-display font-bold text-zinc-900 dark:text-zinc-100">Technical Issue Banner</h2>
            <p className="text-xs text-zinc-500">Display a site-wide maintenance / outage notice</p>
          </div>
        </div>

        {loadingSettings ? (
          <div className="space-y-4 animate-pulse">
            <div className="skeleton h-10 rounded-xl" />
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Title</label>
              <input
                className="input-base"
                placeholder="e.g., Scheduled Maintenance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Description</label>
              <textarea
                className="input-base resize-none"
                rows={3}
                placeholder="We are currently performing maintenance. The site will be back soon."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Start Time
                </label>
                <input
                  type="datetime-local"
                  className="input-base"
                  value={waitFrom}
                  onChange={(e) => setWaitFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> End Time (optional)
                </label>
                <input
                  type="datetime-local"
                  className="input-base"
                  value={waitUntil}
                  onChange={(e) => setWaitUntil(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Banner Image (optional)</label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative aspect-[3/1] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleRemoveNewImage}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-[3/1] rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-brand-400 transition-colors">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">Click to upload banner image</p>
                      <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">
                        PNG, JPG, WebP — Recommended: 1920×480px
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {existingImage && !imageFile && (
                <p className="text-xs text-zinc-400 mt-1">Current image will be kept if you don't upload a new one.</p>
              )}
            </div>

            <button
              onClick={handleSaveTechnicalIssue}
              disabled={savingSettings}
              className="btn-primary w-full justify-center gap-2 disabled:opacity-60"
            >
              {savingSettings ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}