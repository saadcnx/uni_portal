import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * TableSkeleton renders placeholder skeleton rows matching the exact 44px (h-11) height,
 * header styling, and border structure of DataTable to prevent Cumulative Layout Shift (CLS < 0.1)
 * on initial page or route load.
 */

export interface TableSkeletonProps {
  /** Number of placeholder skeleton rows to render. Defaults to 5. */
  rowCount?: number;
  /** Number of placeholder columns to render. Defaults to 4. */
  columnCount?: number;
  /** Optional custom CSS classes for the container. */
  className?: string;
  /** Whether to wrap the table in the standard rounded-xl bordered container. Defaults to true. */
  withContainer?: boolean;
}

export function TableSkeleton({
  rowCount = 5,
  columnCount = 4,
  className,
  withContainer = true,
}: TableSkeletonProps) {
  // Staggered widths for header and body cells to simulate realistic tabular data
  const headerWidths = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-24"];
  const cellWidths = ["w-32", "w-40", "w-24", "w-36", "w-20", "w-28"];

  const content = (
    <Table>
      <TableHeader className="bg-muted/50 border-b border-border">
        <TableRow className="h-11 hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableHead key={colIndex} className="h-11 px-4">
              <Skeleton
                className={cn(
                  "h-4",
                  headerWidths[colIndex % headerWidths.length]
                )}
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="h-11 hover:bg-transparent">
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <TableCell key={colIndex} className="h-11 px-4">
                <Skeleton
                  className={cn(
                    "h-4",
                    cellWidths[(colIndex + rowIndex) % cellWidths.length]
                  )}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (!withContainer) {
    return content;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border overflow-hidden bg-card",
        className
      )}
      aria-hidden="true"
      aria-label="Loading table data"
    >
      {content}
    </div>
  );
}
