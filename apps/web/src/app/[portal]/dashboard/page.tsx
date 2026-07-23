import { PageTransition } from '@/components/shared/page-transition';
import { Header } from '@/components/layout/header';
import { DashboardLoader } from './dashboard-loader';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  const isHrd = portal === 'hrd';

  return (
    <PageTransition>
      <div className="space-y-6">
        <Header />
        <DashboardLoader isHrd={isHrd} />
      </div>
    </PageTransition>
  );
}
