import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import { Sidebar } from '@/components/layout/sidebar';
import { AccountMenu } from '@/components/layout/account-menu';

const getSession = cache(() => getServerSession(authOptions));

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  const session = await getSession();

  if (!session) redirect('/login');

  const role = (session.user as any).role as 'employee' | 'hrd' | 'admin';
  const userPortal = role === 'admin' ? 'hrd' : role;

  // Invalid portal segment → send to user's own portal
  if (portal !== 'employee' && portal !== 'hrd') redirect(`/${userPortal}/dashboard`);

  // Wrong portal for this user's role → send to their own portal (not login)
  if (portal !== userPortal) redirect(`/${userPortal}/dashboard`);

  return (
    <>
      <Sidebar role={userPortal} />
      <main className="min-h-screen bg-background lg:pl-[var(--sidebar-width)] pb-24 lg:pb-0 transition-all duration-300">
        <div className={`mx-auto px-4 py-6 lg:p-8 ${portal === 'hrd' ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <div className="mb-4 flex justify-end lg:hidden">
            <AccountMenu role={userPortal === 'hrd' ? 'hrd' : 'employee'} />
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
