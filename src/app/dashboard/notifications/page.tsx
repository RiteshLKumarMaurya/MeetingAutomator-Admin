'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, Trash2, Repeat, Eye, EyeOff, Search, ChevronLeft, ChevronRight,
  Upload, X, CheckCircle2, AlertCircle, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { useAdminNotifications, useSendNotification, useDeleteNotification, useResendNotification } from '@/hooks/useApi';
import { getMediaUrl } from '@/lib/cdn';;
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { NotificationType, NotificationResponse } from '@/types';

const NOTIFICATION_TYPES: { value: NotificationType; label: string; color: string }[] = [
  { value: 'LEAD', label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'PROMOTION', label: 'Promotion', color: 'bg-amber-100 text-amber-700' },
  { value: 'PAYMENT', label: 'Payment', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'SYSTEM', label: 'System', color: 'bg-purple-100 text-purple-700' },
  { value: 'SECURITY', label: 'Security', color: 'bg-red-100 text-red-700' },
];

// ============================================================
// Send Notification Modal
// ============================================================
function SendNotificationModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync: sendNotification, isPending } = useSendNotification();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('SYSTEM');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendToAll, setSendToAll] = useState(true);
  const [sendToAllDevices, setSendToAllDevices] = useState(true);
  const [userId, setUserId] = useState('');
  const [userIds, setUserIds] = useState('');
  const [deviceToken, setDeviceToken] = useState('');

  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!message.trim()) {
      toast.error('Message is required');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('message', message.trim());
    formData.append('notificationType', type);
    if (redirectUrl.trim()) formData.append('redirectUrl', redirectUrl.trim());
    if (imageFile) formData.append('notificationImageFile', imageFile);
    formData.append('sendToAll', String(sendToAll));
    formData.append('sendToAllDevices', String(sendToAllDevices));
    if (deviceToken.trim()) formData.append('deviceToken', deviceToken.trim());
    if (userId.trim()) formData.append('userId', userId.trim());
if (userIds.trim()) {
      userIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .forEach((id) => formData.append('userIds', id));
    }
    setSaving(true);
    try {
      await sendNotification(formData);
      toast.success('Notification sent successfully');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send notification');
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
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-xl font-bold">Send Notification</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Title *</label>
            <input className="input-base" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Special Offer" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Message *</label>
            <textarea className="input-base resize-none" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message here..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Notification Type</label>
            <div className="flex flex-wrap gap-2">
              {NOTIFICATION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    type === t.value ? t.color : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Redirect URL (optional)</label>
            <input className="input-base" value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Image (optional)</label>
            <div className="flex items-start gap-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={handleRemoveImage} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed cursor-pointer hover:border-brand-400">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-[10px]">Upload</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
              <p className="text-xs text-zinc-500">Recommended: 512×512px</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="text-xs font-semibold text-zinc-500 mb-2 block">Target Audience</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sendToAll} onChange={e => setSendToAll(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm">Send to all users</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sendToAllDevices} onChange={e => setSendToAllDevices(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm">Send to all devices of each user</span>
              </label>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Specific User ID (optional)</label>
                <input className="input-base" type="number" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g., 123" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Multiple User IDs (comma separated)</label>
                <input className="input-base" value={userIds} onChange={e => setUserIds(e.target.value)} placeholder="e.g., 1,2,3" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Specific Device Token (optional)</label>
                <input className="input-base" value={deviceToken} onChange={e => setDeviceToken(e.target.value)} placeholder="FCM token" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || isPending} className="btn-primary flex-1 justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Notifications Page
// ============================================================
export default function AdminNotificationsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const { data, isLoading, refetch } = useAdminNotifications(page, 10);
  const { mutateAsync: deleteNotification } = useDeleteNotification();
  const { mutateAsync: resendNotification } = useResendNotification();

  const notifications = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.number ?? 0;

  const filtered = notifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.message.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notification? This cannot be undone.')) return;
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleResend = async (id: number) => {
    try {
      await resendNotification(id);
      toast.success('Notification resent');
    } catch {
      toast.error('Failed to resend');
    }
  };

  const getTypeBadge = (type: NotificationType) => {
    const t = NOTIFICATION_TYPES.find(nt => nt.value === type);
    return t ? t.color : 'bg-zinc-100 text-zinc-700';
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showSendModal && <SendNotificationModal onClose={() => setShowSendModal(false)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-zinc-500">{totalElements} total notifications</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowSendModal(true)} className="btn-primary gap-2">
            <Send className="w-4 h-4" /> Send Notification
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          className="input-base pl-9"
          placeholder="Search by title or message..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">Title / Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Sent</th>
                <th className="px-4 py-3 text-center text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" />)</td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400">
                    {search ? `No notifications matching "${search}"` : 'No notifications sent yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map(n => (
                  <motion.tr key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-xs">{n.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getTypeBadge(n.notificationType))}>
                        {n.notificationType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {n.allDevices ? 'All devices' : 'Single device'}
                    </td>
                    <td className="px-4 py-3">
                      {n.media ? <img src={getMediaUrl(n.media)} alt="icon" className="w-8 h-8 rounded object-cover" /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {formatDate(n.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleResend(n.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-zinc-400 hover:text-brand-500" title="Resend">
                          <Repeat className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" title="Delete">
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

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t bg-zinc-50/30">
            <span className="text-xs text-zinc-500">Page {currentPage + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg border disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={currentPage + 1 >= totalPages}
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