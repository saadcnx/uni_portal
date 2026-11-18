import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * StatCardSkeleton matches the exact bounding box and padding of StatCard to prevent
 * Cumulative Layout Shift (CLS < 0.1) while dashboard metric queries are in-flight.
 */

export interface StatCardSkeletonProps {
  /** Optional container CSS class */
  className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <Card
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-none",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          {/* Label skeleton */}
          <Skeleton className="h-3.5 w-24" />
          {/* Value skeleton (28px height equivalent) */}
          <Skeleton className="h-7 w-20" />
        </div>
        {/* Icon square skeleton (size-9) */}
        <Skeleton className="size-9 rounded-lg shrink-0" />
      </div>

      {/* Hint skeleton */}
      <div className="mt-3">
        <Skeleton className="h-3 w-28" />
      </div>
    </Card>
  );
}
