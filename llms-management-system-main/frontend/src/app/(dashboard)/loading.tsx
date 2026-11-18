import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Layout-matching skeleton for dashboard route transitions.
 * Prevents Cumulative Layout Shift (CLS) by mirroring PageHeader, StatCards, and Table anatomy.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-2 pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Metric Stat Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main content / table skeleton */}
      <TableSkeleton rowCount={5} columnCount={4} />
    </div>
  );
}
