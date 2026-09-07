'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, Edit, Trash2, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import { useAdminWebLinks } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { WebLinkResponse, WebLinkType } from '@/types';

// All possible WebLinkType values from backend
const WEB_LINK_TYPES: { value: WebLinkType; label: string }[] = [
  { value: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { value: 'TERMS_CONDITIONS', label: 'Terms & Conditions' },
  { value: 'DELETE_ACCOUNT', label: 'Delete Account' },
  { value: 'REFUND_POLICY', label: 'Refund Policy' },
  { value: 'SHIPPING_POLICY', label: 'Shipping Policy' },
  { value: 'CANCELLATION_POLICY', label: 'Cancellation Policy' },
  { value: 'RETURN_POLICY', label: 'Return Policy' },
  { value: 'ABOUT_US', label: 'About Us' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'USER_AGREEMENT', label: 'User Agreement' },
  { value: 'COOKIE_POLICY', label: 'Cookie Policy' },
  { value: 'LOYALTY_PROGRAM', label: 'Loyalty Program' },
  { value: 'CAREERS', label: 'Careers' },
];

function WebLinkRow({
  link,
  onSave,
  onDelete,
}: {
  link: WebLinkResponse;
  onSave: (id: number, data: { name: string; url: string; type: WebLinkType; isActive: boolean }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(link.name);
  const [url, setUrl] = useState(link.url);
  const [type, setType] = useState<WebLinkType>(link.type);
  const [isActive, setIsActive] = useState(link.isActive);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(link.id, { name: name.trim(), url: url.trim(), type, isActive });
      setEditing(false);
      toast.success('Link updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center flex-shrink-0">
        <Globe className="w-4 h-4 text-brand-500" />
      </div>
      {editing ? (
        <>
          <input
            className="input-base flex-1 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          <input
            className="input-base flex-1 py-1.5 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
          <select
            className="input-base w-40 py-1.5 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as WebLinkType)}
          >
            {WEB_LINK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-xs text-zinc-500">Active</span>
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-1.5 px-3 text-xs disabled:opacity-60"
          >
            {saving ? '...' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {link.name}
            </p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-500 hover:underline truncate block"
            >
              {link.url}
            </a>
          </div>
          <span className="badge-zinc text-xs flex-shrink-0">
            {WEB_LINK_TYPES.find(t => t.value === link.type)?.label || link.type}
          </span>
          {link.isActive ? (
            <span className="badge-green text-xs flex-shrink-0">Active</span>
          ) : (
            <span className="badge-zinc text-xs flex-shrink-0">Inactive</span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            <Edit className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}

export default function AdminWebLinksPage() {
  const qc = useQueryClient();
  const { data: webLinks, isLoading } = useAdminWebLinks();

  const [addingLink, setAddingLink] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '', type: 'PRIVACY_POLICY' as WebLinkType, isActive: true });
  const [addingLinkLoading, setAddingLinkLoading] = useState(false);

  const handleSaveWebLink = async (id: number, data: { name: string; url: string; type: WebLinkType; isActive: boolean }) => {
    // Backend expects { name, url, type, isActive }
    await adminApi.updateWebLink(id, data);
    qc.invalidateQueries({ queryKey: ['admin', 'web-links'] });
  };

  const handleDeleteWebLink = async (id: number) => {
    if (!confirm('Delete this web link?')) return;
    try {
      await adminApi.deleteWebLink(id);
      toast.success('Link deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'web-links'] });
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleAddWebLink = async () => {
    if (!newLink.name.trim() || !newLink.url.trim()) {
      toast.error('Name and URL required');
      return;
    }
    setAddingLinkLoading(true);
    try {
      await adminApi.createWebLink(newLink);
      toast.success('Web link added');
      qc.invalidateQueries({ queryKey: ['admin', 'web-links'] });
      setNewLink({ name: '', url: '', type: 'PRIVACY_POLICY', isActive: true });
      setAddingLink(false);
    } catch {
      toast.error('Failed to add');
    } finally {
      setAddingLinkLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Web Links</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage legal, policy, and information pages</p>
        </div>
        <button
          onClick={() => setAddingLink(true)}
          className="btn-primary text-sm gap-1"
        >
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-base p-6"
      >
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded" />
            ))}
          </div>
        ) : (webLinks ?? []).length === 0 && !addingLink ? (
          <p className="text-sm text-zinc-400 text-center py-6">No web links yet. Click "Add Link" to create one.</p>
        ) : (
          (webLinks ?? []).map((link) => (
            <WebLinkRow
              key={link.id}
              link={link}
              onSave={handleSaveWebLink}
              onDelete={handleDeleteWebLink}
            />
          ))
        )}

        <AnimatePresence>
          {addingLink && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="input-base text-sm py-2"
                  placeholder="Name (e.g., Privacy Policy)"
                  value={newLink.name}
                  onChange={(e) => setNewLink((l) => ({ ...l, name: e.target.value }))}
                />
                <input
                  className="input-base text-sm py-2"
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink((l) => ({ ...l, url: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  className="input-base text-sm py-2"
                  value={newLink.type}
                  onChange={(e) => setNewLink((l) => ({ ...l, type: e.target.value as WebLinkType }))}
                >
                  {WEB_LINK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLink.isActive}
                    onChange={(e) => setNewLink((l) => ({ ...l, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Active (visible on site)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddWebLink}
                  disabled={addingLinkLoading}
                  className="btn-primary text-xs py-2 px-4 gap-1"
                >
                  {addingLinkLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Add Link
                </button>
                <button
                  onClick={() => setAddingLink(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}