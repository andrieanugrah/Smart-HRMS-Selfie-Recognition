import { HRDBento } from './hrd-bento';
import { EmployeeBento } from './employee-bento';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardLoader({ isHrd }: { isHrd: boolean }) {
  return isHrd ? <HRDBento /> : <EmployeeBento />;
}


export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    </div>
  );
}
