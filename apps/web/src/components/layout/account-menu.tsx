'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User, SignOut } from '@phosphor-icons/react';
import { useSession } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AccountMenu({ role }: { role: 'employee' | 'hrd' }) {
  const { data: session } = useSession();
  const userName = session?.user?.name || 'User';
  const image = (session?.user as { image?: string | null } | undefined)?.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Buka menu akun"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full ring-2 ring-background transition-shadow hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={userName} size="sm" src={image} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-sm text-foreground">{userName}</span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-widest">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === 'employee' && (
          <DropdownMenuItem asChild>
            <Link href="/employee/profile">
              <User className="h-4 w-4" />
              Profil
            </Link>
          </DropdownMenuItem>
        )}
        {role === 'employee' && <DropdownMenuSeparator />}
        <DropdownMenuItem
          destructive
          onSelect={() => signOut({ callbackUrl: '/login' })}
        >
          <SignOut className="h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
