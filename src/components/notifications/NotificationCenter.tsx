'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, Check, CheckCheck, Clock, ExternalLink, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  appointmentId: string | null;
  targetUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

function formatNotificationTimestamp(isoString: string): string {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '';
  return `${new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dt)} IST`;
}

interface NotificationCenterProps {
  variant?: 'dashboard' | 'bell';
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  variant = 'dashboard',
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.id || '';

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load notifications');
      return res.json();
    },
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 8000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark all notifications as read');
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (variant !== 'bell' || !dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [variant, dropdownOpen]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleOpenNotification = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.targetUrl) {
      setDropdownOpen(false);
      router.push(item.targetUrl);
    }
  };

  const renderListBody = (compact: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-2.5 py-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-16 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 space-y-2">
          <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
            <Bell className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-slate-800">No notifications yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Booking confirmations, new patient consultation alerts, and cancellation updates will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className={`space-y-2.5 ${compact ? 'max-h-80 overflow-y-auto pr-1' : 'max-h-[420px] overflow-y-auto pr-1'}`}>
        {notifications.map((item) => {
          const isCancelled = item.type === 'APPOINTMENT_CANCELLED';
          const isClickable = Boolean(item.targetUrl);

          return (
            <div
              key={item.id}
              data-notification-id={item.id}
              data-notification-read={item.isRead ? 'true' : 'false'}
              onClick={() => isClickable && handleOpenNotification(item)}
              className={`rounded-xl border p-3.5 transition-all ${
                isClickable ? 'cursor-pointer hover:border-brand-400' : ''
              } ${
                item.isRead
                  ? 'bg-white border-slate-200 text-slate-600'
                  : 'bg-brand-50/70 border-brand-200 shadow-sm text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isCancelled
                        ? 'bg-rose-100 text-rose-700'
                        : item.isRead
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-brand-600 text-white'
                    }`}
                  >
                    {isCancelled ? <XCircle className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-brand-600 shrink-0"
                          aria-label="Unread notification"
                        />
                      )}
                      <p
                        className={`text-xs sm:text-sm leading-snug ${
                          item.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-950'
                        }`}
                      >
                        {item.title}
                      </p>
                      <Badge variant={item.isRead ? 'default' : 'brand'} className="text-[10px]">
                        {item.isRead ? 'Read' : 'Unread'}
                      </Badge>
                    </div>

                    <p className={`text-xs leading-relaxed ${item.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                      {item.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatNotificationTimestamp(item.createdAt)}
                      </span>
                      {item.targetUrl && (
                        <span className="inline-flex items-center gap-1 text-brand-700 font-semibold">
                          View appointment
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!item.isRead && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(item.id);
                    }}
                    disabled={markReadMutation.isPending}
                    className="shrink-0 text-[11px] h-7 px-2.5 gap-1 bg-white border-brand-200 text-brand-700 hover:bg-brand-50"
                  >
                    <Check className="h-3 w-3" />
                    Mark as read
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (variant === 'bell') {
    if (!user) return null;

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          aria-label={`Notifications (${unreadCount} unread)`}
          className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-brand-700 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="fixed inset-x-4 top-[4.25rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] rounded-2xl border border-slate-200 bg-white shadow-xl p-4 space-y-3 z-50">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-600" />
                <span className="font-bold text-sm text-slate-900">Notifications</span>
                <Badge variant={unreadCount > 0 ? 'brand' : 'default'} className="text-[10px]">
                  {unreadCount} unread
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllReadMutation.isPending}
                className="text-xs h-7 px-2 gap-1 text-brand-700 hover:bg-brand-50 disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            </div>
            {renderListBody(true)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6 border-slate-200 shadow-sm space-y-4" data-testid="notification-centre">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                data-testid="unread-count-dot"
                className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-900">Notification Centre</h2>
              <Badge
                variant={unreadCount > 0 ? 'brand' : 'default'}
                className="text-[11px]"
                data-testid="unread-count-badge"
              >
                {unreadCount} Unread
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Real-time booking confirmations, consultation alerts, and cancellation updates.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={unreadCount === 0 || markAllReadMutation.isPending}
          isLoading={markAllReadMutation.isPending}
          className="gap-1.5 text-xs border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all as read
        </Button>
      </div>

      {renderListBody(false)}
    </Card>
  );
};
