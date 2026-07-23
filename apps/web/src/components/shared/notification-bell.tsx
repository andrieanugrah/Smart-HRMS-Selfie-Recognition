'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getMyNotificationsBundle,
  markAllRead,
  markNotificationRead,
} from '@/app/actions/notifications';
import { useSocketEvent, useDebouncedRefresh } from '@/components/providers/socket-provider';
import { formatDateTime } from '@/lib/utils';

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const bundle = await getMyNotificationsBundle();
    setCount(bundle.unread);
    setItems(bundle.items);
  }, []);

  const refresh = useDebouncedRefresh(load, 150);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent('leave:approved', refresh);
  useSocketEvent('leave:rejected', refresh);
  useSocketEvent('overtime:approved', refresh);
  useSocketEvent('overtime:rejected', refresh);
  useSocketEvent('attendance:success', refresh);

  async function handleItemClick(item: any) {
    if (item.is_read) return;
    setItems((arr) => arr.map((i) => (i.id === item.id ? { ...i, is_read: true } : i)));
    setCount((c) => Math.max(c - 1, 0));
    await markNotificationRead(item.id);
  }

  async function handleMarkAll() {
    setCount(0);
    setItems((arr) => arr.map((i) => ({ ...i, is_read: true })));
    await markAllRead();
    toast.success('Semua notifikasi ditandai dibaca');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifikasi"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-border/60 bg-card/70 hover:bg-card transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(244,63,94,0.5)]">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifikasi</h3>
          {count > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Tandai dibaca
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada notifikasi
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full text-left p-3 hover:bg-muted/50 border-b last:border-0 transition-colors ${
                  !item.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <p className="text-sm font-medium flex items-start gap-2">
                  {!item.is_read && (
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <span className="flex-1">{item.title}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {formatDateTime(item.created_at)}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
