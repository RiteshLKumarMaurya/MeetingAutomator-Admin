'use client';

import { useEffect, useState } from 'react';
import { Edit3, Plus, Shield, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '@/services/api';
import type { RoleName, RoleRequest } from '@/types';

const ROLE_OPTIONS: RoleName[] = ['ROLE_ADMIN', 'ROLE_CLIENT'];

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminApi.getRoles().then((response) => response.data.data),
  });
  const [editing, setEditing] = useState<{ id: number; name: RoleName } | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState<RoleName>('ROLE_CLIENT');

  useEffect(() => {
    if (editing) setName(editing.name);
  }, [editing]);

  const createMutation = useMutation({
    mutationFn: (data: RoleRequest) => adminApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setCreating(false);
      toast.success('Role created.');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to create role.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleRequest }) => adminApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setEditing(null);
      toast.success('Role updated.');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to update role.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast.success('Role deleted.');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to delete role. It may still be assigned to users.'),
  });

  const submit = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: { name } });
    else createMutation.mutate({ name });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Roles</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage the roles available to Meeting Automator users.</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2" onClick={() => { setName('ROLE_CLIENT'); setCreating(true); }}>
          <Plus className="h-4 w-4" /> Add role
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
          <span>Role</span><span>Identifier</span><span>Actions</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-muted">Loading roles…</div>
        ) : roles.map((role) => (
          <div key={role.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400"><Shield className="h-4 w-4" /></div>
              <div><p className="text-sm font-semibold text-text-primary">{role.name.replace('ROLE_', '')}</p><p className="text-xs text-text-muted">Role ID #{role.id}</p></div>
            </div>
            <code className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{role.name}</code>
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-brand-500 dark:hover:bg-zinc-800" onClick={() => setEditing({ id: role.id, name: role.name })} title="Edit"><Edit3 className="h-4 w-4" /></button>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/20" onClick={() => { if (window.confirm(`Delete ${role.name.replace('ROLE_', '')}?`)) deleteMutation.mutate(role.id); }} title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!isLoading && roles.length === 0 && <div className="p-10 text-center text-sm text-text-muted">No roles found.</div>}
      </div>

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div><h2 className="font-display text-lg font-bold text-text-primary">{editing ? 'Edit role' : 'Create role'}</h2><p className="text-sm text-text-secondary">Select the role identifier used by the backend.</p></div>
              <button onClick={closeModal} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-6 block text-xs font-semibold text-text-secondary">Role</label>
            <select value={name} onChange={(event) => setName(event.target.value as RoleName)} className="input mt-2 w-full">
              {ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option.replace('ROLE_', '')}</option>)}
            </select>
            <div className="mt-6 flex justify-end gap-2"><button className="btn-secondary" onClick={closeModal}>Cancel</button><button className="btn-primary" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending || Boolean(editing && name === editing.name)}>{editing ? (name === editing.name ? 'No changes' : 'Save changes') : 'Create role'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
