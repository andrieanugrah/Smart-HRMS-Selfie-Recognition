'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bell, Check, CheckCircle2, XCircle, Clock, Info, DollarSign, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

function getNotificationIcon(title: string, type?: string) {
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('disetujui') || lowerTitle.includes('approved')) {
    return <CheckCircle2 className="w-4 h-4 text-success shrink-0" />;
  }
  if (lowerTitle.includes('ditolak') || lowerTitle.includes('rejected')) {
    return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  }
  if (lowerTitle.includes('lembur') || lowerTitle.includes('overtime')) {
    return <Clock className="w-4 h-4 text-warning shrink-0" />;
  }
  if (lowerTitle.includes('gaji') || lowerTitle.includes('payroll')) {
    return <DollarSign className="w-4 h-4 text-success shrink-0" />;
  }
  if (lowerTitle.includes('klaim') || lowerTitle.includes('reimbursement')) {
    return <Receipt className="w-4 h-4 text-warning shrink-0" />;
  }
  return <Info className="w-4 h-4 text-info shrink-0" />;
}

export function NotificationBell() {
  const router = useRouter();
  const params = useParams();
  const portal = (params?.portal as string) ?? 'employee';

  const [count, setCount] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const bundle = await getMyNotificationsBundle();
      setCount(bundle.unread);
      setItems(bundle.items);
    } catch (e) {
      console.error('[NotificationBell] failed to load notifications:', e);
    }
  }, []);

  const refresh = useDebouncedRefresh(load, 150);

  const handleSocketNotification = useCallback(
    (eventTitle: string, eventMessage?: string) => {
      refresh();
      if (eventTitle) {
        toast.info(eventTitle, { description: eventMessage });
      }
    },
    [refresh]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  // Real-time socket listeners for employee & HRD
  useSocketEvent('leave:new', () => handleSocketNotification('Pengajuan Cuti Baru'));
  useSocketEvent('leave:approved', () => handleSocketNotification('Cuti Disetujui'));
  useSocketEvent('leave:rejected', () => handleSocketNotification('Cuti Ditolak'));
  useSocketEvent('overtime:new', () => handleSocketNotification('Pengajuan Lembur Baru'));
  useSocketEvent('overtime:approved', () => handleSocketNotification('Lembur Disetujui'));
  useSocketEvent('overtime:rejected', () => handleSocketNotification('Lembur Ditolak'));
  useSocketEvent('reimbursement:new', () => handleSocketNotification('Pengajuan Klaim Baru'));
  useSocketEvent('reimbursement:approved', () => handleSocketNotification('Klaim Disetujui'));
  useSocketEvent('reimbursement:rejected', () => handleSocketNotification('Klaim Ditolak'));
  useSocketEvent('attendance:success', () => handleSocketNotification('Presensi Berhasil'));
  useSocketEvent('announcement:new', () => handleSocketNotification('Pengumuman Baru'));

  async function handleItemClick(item: any) {
    if (!item.is_read) {
      setItems((arr) => arr.map((i) => (i.id === item.id ? { ...i, is_read: true } : i)));
      setCount((c) => Math.max(c - 1, 0));
      void markNotificationRead(item.id);
    }

    setOpen(false);

    // Smart Navigation Routing on Click
    const refType = (item.reference_type || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    if (refType === 'leave' || title.includes('cuti')) {
      router.push(`/${portal}/leave`);
    } else if (refType === 'overtime' || title.includes('lembur')) {
      router.push(`/${portal}/overtime`);
    } else if (refType === 'payroll' || title.includes('gaji')) {
      router.push(`/${portal}/payroll`);
    } else if (refType === 'reimbursement' || title.includes('klaim')) {
      router.push(`/${portal}/reimbursement`);
    } else if (refType === 'announcement' || title.includes('pengumuman')) {
      router.push(`/${portal}/announcements`);
    } else if (refType === 'attendance' || title.includes('presensi')) {
      router.push(`/${portal}/attendance`);
    }
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
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          aria-label="Notifikasi"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-border/60 bg-card/70 hover:bg-card transition-colors shadow-xs"
        >
          <motion.div
            animate={
              count > 0
                ? { rotate: [0, -12, 12, -8, 8, 0] }
                : { rotate: 0 }
            }
            transition={{
              repeat: count > 0 ? Infinity : 0,
              repeatDelay: 3.5,
              duration: 0.6,
            }}
          >
            <Bell className={`w-5 h-5 transition-colors ${count > 0 ? 'text-foreground font-bold' : 'text-muted-foreground'}`} />
          </motion.div>

          {count > 0 && (
            <>
              {/* Outer Pulse Ping Effect */}
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 animate-ping opacity-75" />
              {/* Badge Label */}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(244,63,94,0.6)]"
              >
                {count > 9 ? '9+' : count}
              </motion.span>
            </>
          )}
        </motion.button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-88 p-0 overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-elev-lg animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-foreground">Notifikasi</h3>
            {count > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {count} Baru
              </span>
            )}
          </div>
          {count > 0 && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Tandai dibaca
            </motion.button>
          )}
        </div>

        <div className="max-h-84 overflow-y-auto divide-y divide-border/60">
          {items.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-muted-foreground">Belum ada notifikasi</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Semua pemberitahuan akan muncul di sini</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item, index) => {
                const IconComponent = getNotificationIcon(item.title, item.type);

                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      !item.is_read ? 'bg-primary/5 font-medium' : 'bg-transparent'
                    }`}
                  >
                    <div className="mt-0.5">{IconComponent}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
