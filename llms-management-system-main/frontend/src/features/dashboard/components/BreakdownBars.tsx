"use client";

import * as React from "react";
import { ChartCard } from "@/components/shared/ChartCard";
import { cn } from "@/lib/utils";

export interface BreakdownItem {
  label: string;
  count: number;
  color?: string;
}

export interface BreakdownBarsProps {
  title: string;
  description?: string;
  period?: string;
  items?: BreakdownItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

/**
 * Re-render reasoning:
 * Memoized to prevent re-render cascading when sibling components update.
 * Adheres to DESIGN.md Section 6:
 * - Horizontal bars for breakdowns (label, bar and value)
 * - Token-based chart colors
 * - Embedded in ChartCard for consistent height (280px) and loading/empty/error states
 */
export const BreakdownBars = React.memo(function BreakdownBars({
  title,
  description,
  period,
  items = [],
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle = "No data available",
  emptyDescription = "No breakdown metrics recorded.",
  className,
}: BreakdownBarsProps) {
  const total = React.useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [items]);

  const isEmpty = !isLoading && (items.length === 0 || total === 0);

  return (
    <ChartCard
      title={title}
      description={description}
      period={period}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      isError={isError}
      onRetry={onRetry}
      height={280}
      className={className}
    >
      <div className="flex h-full flex-col justify-center gap-5 p-2">
        {items.map((item, index) => {
          const percentage =
            total > 0 ? Math.round((item.count / total) * 100) : 0;
          const barColor =
            item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  <strong className="font-semibold text-foreground">
                    {item.count}
                  </strong>{" "}
                  ({percentage}%)
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label}: ${item.count} (${percentage}%)`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    barColor
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
});
