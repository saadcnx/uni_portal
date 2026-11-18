"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * DataTablePagination accepts controlled `page` and `limit` props sourced directly
 * from URL search parameters (via nuqs). Page and limit updates mutate the URL,
 * causing only the active table query and body to re-render rather than duplicating
 * pagination state across component trees.
 */

export interface DataTablePaginationProps {
  /** Current 1-based page number */
  page: number;
  /** Number of rows per page */
  limit: number;
  /** Total count of records */
  total: number;
  /** Callback fired when the active page changes */
  onPageChange: (page: number) => void;
  /** Optional callback fired when the rows per page changes */
  onLimitChange?: (limit: number) => void;
  /** Available page size options. Defaults to [10, 20, 50] */
  pageSizeOptions?: number[];
  /** Whether pagination controls are disabled (e.g. while data is fetching) */
  disabled?: boolean;
  /** Optional custom CSS classes */
  className?: string;
}

export function DataTablePagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  className,
}: DataTablePaginationProps) {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const start = total === 0 ? 0 : (page - 1) * safeLimit + 1;
  const end = total === 0 ? 0 : Math.min(page * safeLimit, total);

  const canPrevious = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled && total > 0;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-card",
        className
      )}
    >
      {/* Record counter with tabular numbers */}
      <div className="text-sm text-muted-foreground tabular-nums">
        {total === 0 ? (
          "No results"
        ) : total <= safeLimit ? (
          <>
            Showing <span className="font-medium text-foreground">{total}</span>{" "}
            {total === 1 ? "result" : "results"}
          </>
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-foreground">{start}</span>–
            <span className="font-medium text-foreground">{end}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> results
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Rows per page selector */}
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page
            </span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                if (val && onLimitChange) {
                  onLimitChange(Number(val));
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-18 text-xs font-medium"
                aria-label="Select rows per page"
              >
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent side="top" align="end">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Previous and Next navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrevious}
            className="h-8 px-3 text-xs"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-3.5 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            className="h-8 px-3 text-xs"
            aria-label="Go to next page"
          >
            Next
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
