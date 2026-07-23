import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/landing-page';

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as any).role as string | undefined;
    const portal = role === 'hrd' || role === 'admin' ? 'hrd' : 'employee';
    redirect(`/${portal}/dashboard`);
  }
  return <LandingPage year={new Date().getFullYear()} />;
}
