"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * ChartCard is memoized to avoid re-rendering heavy visualization canvas/SVG elements
 * when unrelated sibling states update on the dashboard.
 */

export interface ChartCardProps {
  /** Chart card title */
  title: string;
  /** Optional secondary subtitle or description */
  description?: string;
  /** Optional period badge or label (e.g. "Last 30 days", "This week") */
  period?: string;
  /** Content slot rendering the Recharts / shadcn Chart */
  children?: React.ReactNode;
  /** Loading state flag (displays a chart skeleton) */
  isLoading?: boolean;
  /** Empty state flag */
  isEmpty?: boolean;
  /** Custom empty state title */
  emptyTitle?: string;
  /** Custom empty state description */
  emptyDescription?: string;
  /** Error state flag */
  isError?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Callback to retry query when error occurs */
  onRetry?: () => void;
  /** Fixed height for the chart container in pixels. Defaults to 280px (within DESIGN.md 260-300px spec) */
  height?: number;
  /** Optional extra action or dropdown slot on header */
  action?: React.ReactNode;
  /** Container custom classes */
  className?: string;
}

export const ChartCard = React.memo(function ChartCard({
  title,
  description,
  period,
  children,
  isLoading = false,
  isEmpty = false,
  emptyTitle = "No data available",
  emptyDescription = "No data records found for the selected time range.",
  isError = false,
  errorMessage = "Failed to load chart data.",
  onRetry,
  height = 280,
  action,
  className,
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-none flex flex-col justify-between",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {period && (
            <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {period}
            </span>
          )}
          {action}
        </div>
      </div>

      {/* Chart Canvas / State Container */}
      <div
        style={{ height }}
        className="w-full relative flex items-center justify-center overflow-hidden"
      >
        {isLoading ? (
          <div className="w-full h-full flex flex-col justify-end gap-3 p-4">
            <div className="w-full flex items-end justify-between gap-2 h-full">
              <Skeleton className="w-full h-1/3 rounded-t-sm" />
              <Skeleton className="w-full h-2/3 rounded-t-sm" />
              <Skeleton className="w-full h-1/2 rounded-t-sm" />
              <Skeleton className="w-full h-4/5 rounded-t-sm" />
              <Skeleton className="w-full h-3/5 rounded-t-sm" />
              <Skeleton className="w-full h-5/6 rounded-t-sm" />
              <Skeleton className="w-full h-2/3 rounded-t-sm" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ) : isError ? (
          <div className="w-full max-w-sm px-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error loading chart</AlertTitle>
              <AlertDescription className="text-xs">
                {errorMessage}
              </AlertDescription>
              {onRetry && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="h-8 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10"
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </Button>
                </div>
              )}
            </Alert>
          </div>
        ) : isEmpty ? (
          <EmptyState
            size="sm"
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </Card>
  );
});
