'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Pin, AlertCircle, Info } from 'lucide-react';
import { listAnnouncements } from '@/app/actions/announcement';
import type { Announcement } from 'shared';

const URGENCY_STYLE = {
  info: { bg: 'bg-info/10', text: 'text-info', icon: Info },
  warning: { bg: 'bg-warning/10', text: 'text-warning', icon: AlertCircle },
  urgent: { bg: 'bg-danger/10', text: 'text-danger', icon: AlertCircle },
};

export function AnnouncementWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAnnouncements().then((data) => {
      setAnnouncements(data as any);
      setLoading(false);
    });
  }, []);

  if (loading || announcements.length === 0) return null;

  return (
    <Card className="border border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" /> Pengumuman Perusahaan
          </CardTitle>
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {announcements.length} Info
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {announcements.slice(0, 3).map((item) => {
          const style = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.info;
          const UrgencyIcon = style.icon;
          return (
            <div key={item.id} className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  {item.is_pinned && <Pin className="w-3 h-3 text-warning fill-warning" />}
                  <span>{item.title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${style.bg} ${style.text}`}>
                  {item.urgency}
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{item.content}</p>
              <p className="text-[10px] text-muted-foreground/70 pt-1">
                {new Date(item.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
