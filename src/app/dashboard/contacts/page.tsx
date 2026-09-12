'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, ChevronLeft, ChevronRight, Loader2, Trash2, X, Search, Filter
} from 'lucide-react';
import { useAdminContacts, useUpdateContactStatus, useAdminUsers } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { formatDate, formatPrice, cn } from '@/lib/utils';
import type { ContactRequestResponse, LeadStatus, LeadSource, ContactRequestSearchRequest } from '@/types';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'NEW', label: 'New', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400' },
  { value: 'WON', label: 'Won', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' },
  { value: 'LOST', label: 'Lost', color: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' },
];

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'OTHER', label: 'Other' },
];

function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUSES.find((x) => x.value === status);
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', s?.color ?? 'bg-zinc-100 text-zinc-600')}>
      {s?.label ?? status}
    </span>
  );
}

// ============================================================
// Contact Details Modal
// ============================================================
function ContactModal({ contact, onClose }: { contact: ContactRequestResponse; onClose: () => void }) {
  const { mutateAsync: updateStatus, isPending } = useUpdateContactStatus();
  const qc = useQueryClient();

  const handleStatus = async (status: LeadStatus) => {
    try {
      await updateStatus({ id: contact.id, status });
      toast.success('Status updated');
      onClose();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contact request?')) return;
    try {
      await adminApi.deleteContactRequest(contact.id);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'contacts'] });
      onClose();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-display font-bold text-zinc-900 dark:text-zinc-100">
            Contact Request #{contact.id}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-400 font-medium">Name</p>
              <p className="text-sm font-semibold">{contact.name}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Email</p>
              <p className="text-sm">{contact.email}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Phone</p>
              <p className="text-sm">{contact.countryCode}{contact.phone}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Country</p>
              <p className="text-sm">{contact.country}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Company</p>
              <p className="text-sm">{contact.companyName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Source</p>
              <p className="text-sm">{contact.source}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Budget</p>
              <p className="text-sm">
                {contact.budgetMin != null ? (contact.budgetMax != null ? `${formatPrice(contact.budgetMin, contact.currencyCode ?? 'USD')} – ${formatPrice(contact.budgetMax, contact.currencyCode ?? 'USD')}` : formatPrice(contact.budgetMin, contact.currencyCode ?? 'USD')) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Business Model</p>
              <p className="text-sm">{contact.businessModelType || '—'}</p>
            </div>
            {contact.packageName && (
              <div className="col-span-2">
                <p className="text-xs text-zinc-400 font-medium">Package</p>
                <p className="text-sm">{contact.packageName}</p>
              </div>
            )}
          </div>

          {contact.projectIdea && (
            <div>
              <p className="text-xs text-zinc-400 font-medium mb-1">Project Idea</p>
              <p className="text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">{contact.projectIdea}</p>
            </div>
          )}
          {contact.message && (
            <div>
              <p className="text-xs text-zinc-400 font-medium mb-1">Message</p>
              <p className="text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">{contact.message}</p>
            </div>
          )}

          {contact.notes && (
            <div>
              <p className="text-xs text-zinc-400 font-medium mb-1">Admin Notes</p>
              <p className="text-sm bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">{contact.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-400 font-medium mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleStatus(s.value)}
                  disabled={isPending || contact.status === s.value}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                    contact.status === s.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-brand-500/50'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={handleDelete} className="btn-secondary text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button onClick={onClose} className="btn-primary">Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Main Contacts Page
// ============================================================
export default function AdminContactsPage() {
  const [filters, setFilters] = useState<ContactRequestSearchRequest>({
    page: 0,
    size: 10,
    sortBy: 'createdAt',
    direction: 'DESC',
  });
  const [selected, setSelected] = useState<ContactRequestResponse | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading } = useAdminContacts(filters);
  const { data: users } = useAdminUsers(0, 100); // for assigned user filter

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: keyof ContactRequestSearchRequest, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 0 }));
  };

  const clearFilters = () => {
    setFilters({ page: 0, size: 10, sortBy: 'createdAt', direction: 'DESC' });
  };

  const contacts = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.number ?? 0;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selected && <ContactModal contact={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Contact Requests</h1>
          <p className="text-sm text-zinc-500">{totalElements} total leads</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary gap-2"
        >
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-base p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Status</label>
              <select
                className="input-base"
                value={filters.status || ''}
                onChange={e => handleFilterChange('status', e.target.value || undefined)}
              >
                <option value="">All</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Source</label>
              <select
                className="input-base"
                value={filters.source || ''}
                onChange={e => handleFilterChange('source', e.target.value || undefined)}
              >
                <option value="">All</option>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Email</label>
              <input
                className="input-base"
                placeholder="Search by email..."
                value={filters.email || ''}
                onChange={e => handleFilterChange('email', e.target.value || undefined)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Assigned To</label>
              <select
                className="input-base"
                value={filters.assignedToId || ''}
                onChange={e => handleFilterChange('assignedToId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">All</option>
                {users?.content?.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={clearFilters} className="btn-secondary text-sm">Clear Filters</button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="card-base p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-400">
                    No contact requests found.
                  </td>
                </tr>
              ) : (
                contacts.map(contact => (
                  <motion.tr
                    key={contact.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-zinc-50 cursor-pointer"
                    onClick={() => setSelected(contact)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{contact.name}</p>
                      <p className="text-xs text-zinc-400">{contact.companyName || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{contact.email}</td>
                    <td className="px-4 py-3 text-sm">{contact.country}</td>
                    <td className="px-4 py-3 text-sm">
                      {contact.budgetMin ? formatPrice(contact.budgetMin, contact.currencyCode ?? 'USD') : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={contact.status} /></td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {formatDate(contact.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelected(contact)}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-zinc-400 hover:text-brand-500"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t bg-zinc-50/30">
            <span className="text-xs text-zinc-500">
              Page {currentPage + 1} of {totalPages} · {totalElements} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-2 rounded-lg border disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
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