'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Key, Trash2, X } from 'lucide-react';
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { formatDate, cn } from '@/lib/utils';
import { getMediaUrl } from '@/lib/cdn';;
import type { NotificationResponse } from '@/types';

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationResponse;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800',
        !notification.read && 'bg-brand-50/50 dark:bg-brand-950/20'
      )}
    >
      {notification.media && (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={getMediaUrl(notification.media,{key:'optimizedKey'})}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-zinc-400">
            {formatDate(notification.createdAt)}
          </span>
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="text-[10px] font-medium text-brand-500 hover:text-brand-600"
            >
              Mark read
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="text-[10px] text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const { data: unreadCount } = useUnreadCount();
  const { data: notificationsData, refetch } = useNotifications(page, 5);
  const { mutateAsync: markAsRead } = useMarkAsRead();
  const { mutateAsync: markAllAsRead } = useMarkAllAsRead();
  const { mutateAsync: deleteNotification } = useDeleteNotification();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = notificationsData?.content ?? [];
  const totalUnread = unreadCount ?? 0;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refetch when dropdown opens
  const handleToggle = () => {
    if (!isOpen) {
      refetch();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = async (id: number) => {
    await markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this notification?')) {
      await deleteNotification(id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-elevated overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Notifications
                {totalUnread > 0 && (
                  <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    ({totalUnread} unread)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {totalUnread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                >
                  View all
                </Link>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {notificationsData && notificationsData.totalPages > 1 && (
              <div className="flex justify-center py-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs text-zinc-500 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-500 mx-4">
                  {page + 1} / {notificationsData.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= notificationsData.totalPages}
                  className="text-xs text-zinc-500 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}