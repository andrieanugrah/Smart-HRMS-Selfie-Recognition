'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getGreeting } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { NotificationBell } from '@/components/shared/notification-bell';
import { AccountMenu } from '@/components/layout/account-menu';

export function Header({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const { data: session } = useSession();
  const params = useParams();
  const portal = (params?.portal as string) ?? 'employee';
  const userName = session?.user?.name || 'User';
  const greeting = getGreeting();

  return (
    <header className="flex items-start sm:items-center justify-between gap-4 mb-6">
      <div className="min-w-0 flex-1">
        {title || subtitle ? (
          <div className="space-y-1">
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight text-balance">
                {title}
              </h1>
            )}
            {subtitle && <p className="text-sm text-muted-foreground text-balance">{subtitle}</p>}
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight text-balance">
              {userName}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="lg:hidden">
          <ThemeToggle />
        </div>
        <NotificationBell />
        <div className="lg:hidden">
          <AccountMenu role={portal === 'hrd' ? 'hrd' : 'employee'} />
        </div>
      </div>
    </header>
  );
}
