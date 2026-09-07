import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api';
import type { NotificationResponse } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (page: number, size: number) => ['notifications', 'list', page, size] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data.data),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // refetch every minute
  });
}

export function useNotifications(page = 0, size = 10) {
  return useQuery({
    queryKey: notificationKeys.list(page, size),
    queryFn: () => notificationsApi.getMyNotifications(page, size).then((r) => r.data.data),
    staleTime: 30 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────
export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.deleteOne(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount });
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}