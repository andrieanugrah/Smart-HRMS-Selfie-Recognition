'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { cn, getGreeting } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/shared/notification-bell';

export function Header({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const { data: session } = useSession();
  const userName = session?.user?.name || '';
  const greeting = getGreeting();

  // Session is fetched client-side — render plain markup first, then
  // upgrade to hydrated markup. This avoids date/locale drift between
  // server and client renders (e.g. greeting differs by timezone hour).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="min-w-0 flex-1">
        {title || subtitle ? (
          <>
            {title && (
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">
                {title}
              </h1>
            )}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
              {/* Render deterministic server output, fill client value after mount */}
              {mounted ? userName : ''}
            </h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {mounted && <NotificationBell />}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <div className="lg:hidden">
          <ThemeToggle />
        </div>
        {mounted && (
          <div className="hidden lg:block">
            <Avatar name={userName} size="sm" src={(session?.user as any)?.image} />
          </div>
        )}
      </div>
    </header>
  );
}
