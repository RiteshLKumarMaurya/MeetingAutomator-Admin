'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldOff, Shield, ChevronLeft, ChevronRight, Trash2, X,
  User, Phone, MapPin, Link as LinkIcon, Settings,
  Calendar, CheckCircle, XCircle, ExternalLink, Search
} from 'lucide-react';
import { useAdminUsers, useAdminBlockUser } from '@/hooks/useApi';
import { adminApi } from '@/services/api';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { UserProfileResponse, AddressResponse, WebLinkResponse } from '@/types';

// ============================================================
// Full Profile Modal
// ============================================================
function UserProfileModal({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Correct: useEffect for side effects
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getUserById(userId);
        setProfile(res.data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">{error || 'User not found'}</p>
          <button onClick={onClose} className="btn-primary mt-4 w-full">Close</button>
        </div>
      </div>
    );
  }

  const roleColor = profile.roleName === 'ROLE_ADMIN'
    ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';

  const statusColor = profile.blocked
    ? 'bg-red-50 dark:bg-red-950/20 text-red-600'
    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-lg font-bold">
              {profile.fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">{profile.fullName}</h2>
              <p className="text-sm text-zinc-500">{profile.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={Phone} label="Phone" value={profile.phone || '—'} />
            <InfoCard icon={Shield} label="Role" value={profile.roleName?.replace('ROLE_', '') || 'CLIENT'} badgeClass={roleColor} />
            <InfoCard icon={profile.blocked ? XCircle : CheckCircle} label="Status" value={profile.blocked ? 'Blocked' : 'Active'} badgeClass={statusColor} />
            <InfoCard icon={Calendar} label="Joined" value={profile.createdAt ? formatDate(profile.createdAt) : '—'} />
          </div>

          {/* Web Links */}
          {profile.webLinks && profile.webLinks.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-zinc-500" />
                Web Links ({profile.webLinks.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profile.webLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <ExternalLink className="w-3 h-3 text-brand-500" />
                    <span className="text-sm truncate">{link.name}</span>
                    <span className="text-xs text-zinc-400 ml-auto">{link.type}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Addresses */}
          {profile.addresses && profile.addresses.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-500" />
                Addresses ({profile.addresses.length})
              </h3>
              <div className="space-y-3">
                {profile.addresses.map((addr) => (
                  <div key={addr.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-500">{addr.addressType}</span>
                      {addr.isDefault && <span className="badge-green text-[10px]">Default</span>}
                    </div>
                    <p className="text-sm">{addr.addressLine1}</p>
                    {addr.addressLine2 && <p className="text-sm">{addr.addressLine2}</p>}
                    <p className="text-sm text-zinc-600">{addr.city}, {addr.stateName} - {addr.zipCode}</p>
                    <p className="text-sm text-zinc-600">{addr.countryName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, badgeClass }: { icon: any; label: string; value: string; badgeClass?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
      <Icon className="w-5 h-5 text-zinc-500 mt-0.5" />
      <div>
        <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
        {badgeClass ? (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', badgeClass)}>{value}</span>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Users Page
// ============================================================
export default function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data, isLoading } = useAdminUsers(page, 10);
  const { mutateAsync: blockUser } = useAdminBlockUser();
  const qc = useQueryClient();

  const filteredUsers = (data?.content ?? []).filter((user) =>
    user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.phone?.includes(search)
  );

  const handleBlock = async (id: number, blocked: boolean, name: string) => {
    const action = blocked ? 'Unblock' : 'Block';
    if (!confirm(`${action} user "${name}"?`)) return;
    try {
      await blockUser({ id, block: !blocked });
      toast.success(`User ${blocked ? 'unblocked' : 'blocked'}`);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently delete user "${name}"?`)) return;
    try {
      await adminApi.deleteUser(id);
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selectedUserId !== null && (
          <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="text-sm text-zinc-500">{data?.totalElements ?? '—'} total users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10 w-full sm:w-72"
          />
        </div>
      </div>

      <div className="card-base p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 font-bold text-xs">
                          {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{user.fullName || 'Unknown'}</p>
                          <p className="text-xs text-zinc-400 truncate max-w-[160px]">{user.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{user.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-semibold',
                        user.roleName?.includes('ADMIN')
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {user.roleName?.replace('ROLE_', '') || 'CLIENT'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-semibold',
                        user.blocked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      )}>
                        {user.blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {user.createdAt ? formatDate(user.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleBlock(user.id, user.blocked, user.fullName)}
                          className={cn('p-1.5 rounded-lg transition-colors', user.blocked
                            ? 'hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600'
                            : 'hover:bg-amber-50 text-zinc-400 hover:text-amber-600'
                          )}
                        >
                          {user.blocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.fullName)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600"
                        >
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

        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t bg-zinc-50/30">
            <span className="text-xs text-zinc-500">
              Page {(data.number ?? 0) + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={data.first || data.number === 0}
                className="p-2 rounded-lg border disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
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