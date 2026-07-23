import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function PortalRoot({
  params,
}: {
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  redirect(`/${portal}/dashboard`);
}
