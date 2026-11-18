import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-2 pb-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Metric Stat Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts / Table skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
      </div>
      <TableSkeleton rowCount={5} columnCount={5} />
    </div>
  );
}
