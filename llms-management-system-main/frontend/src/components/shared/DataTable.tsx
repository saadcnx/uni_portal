"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * DataTable is a controlled presentation component configured with `manualPagination: true`
 * and `manualSorting: true`. Pagination, filtering, and sorting state reside in URL query
 * parameters (or TanStack Query hooks), so user interactions only re-render the data table
 * rows rather than parent layout trees.
 */

export interface DataTableProps<TData, TValue = unknown> {
  /** Column definitions for the TanStack table */
  columns: ColumnDef<TData, TValue>[];
  /** Array of data rows */
  data: TData[];
  /** Initial loading state (renders TableSkeleton) */
  isLoading?: boolean;
  /** Background fetching state (keeps rows visible at 60% opacity with spinner overlay) */
  isFetching?: boolean;
  /** Error state (renders an Alert with optional retry) */
  isError?: boolean;
  /** Callback to retry data fetching on error */
  onRetry?: () => void;
  /** Custom empty state node to render when data is empty */
  emptyState?: React.ReactNode;
  /** Controlled sorting state */
  sorting?: SortingState;
  /** Controlled sorting change handler */
  onSortingChange?: OnChangeFn<SortingState>;
  /** Optional pagination controls node rendered at table footer */
  pagination?: React.ReactNode;
  /** Optional number of skeleton rows to render during initial load. Defaults to 5. */
  skeletonRowCount?: number;
  /** Custom error message displayed in the error Alert */
  errorMessage?: string;
  /** Optional custom CSS classes for the outer container */
  className?: string;
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  isLoading = false,
  isFetching = false,
  isError = false,
  onRetry,
  emptyState,
  sorting,
  onSortingChange,
  pagination,
  skeletonRowCount = 5,
  errorMessage,
  className,
}: DataTableProps<TData, TValue>) {
  // TanStack Table's API contains internal functions that React Compiler will not auto-memoize
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sorting ?? [],
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // Initial load: render skeleton matching the table structure
  if (isLoading) {
    return (
      <TableSkeleton
        rowCount={skeletonRowCount}
        columnCount={columns.length}
        className={className}
      />
    );
  }

  // Error state: render Alert with Retry button inside bordered container
  if (isError) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border overflow-hidden bg-card p-6 flex flex-col items-center justify-center min-h-[260px]",
          className
        )}
      >
        <Alert variant="destructive" className="max-w-md text-left">
          <AlertCircle className="size-4" />
          <AlertTitle>Failed to load data</AlertTitle>
          <AlertDescription className="text-xs">
            {errorMessage ??
              "An unexpected error occurred while fetching table records. Please try again."}
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
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border overflow-hidden bg-card",
        className
      )}
    >
      {/* Background fetching indicator: subtle spinner overlay while rows stay at 60% opacity */}
      {isFetching && !isLoading && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 shadow-xs backdrop-blur-xs">
            <Spinner className="size-3.5 text-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Updating...
            </span>
          </div>
        </div>
      )}

      <Table>
        <TableHeader className="bg-muted/50 border-b border-border">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="h-11 hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="sticky top-0 z-10 h-11 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted/80 backdrop-blur-xs"
                  style={{
                    width:
                      header.getSize() !== 150 ? header.getSize() : undefined,
                  }}
                >
                  {header.isPlaceholder ? null : typeof header.column.columnDef
                      .header === "string" && header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1.5 hover:text-foreground cursor-pointer select-none transition-colors"
                      aria-label={`Sort by ${header.column.columnDef.header}`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="size-3.5 text-foreground" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="size-3.5 text-foreground" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className={cn(
            isFetching &&
              !isLoading &&
              "opacity-60 transition-opacity duration-150"
          )}
        >
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="h-11 transition-colors hover:bg-muted/50"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="h-11 px-4 py-2 text-sm align-middle whitespace-nowrap"
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="p-0 text-center"
              >
                <div className="py-8 flex items-center justify-center">
                  {emptyState ?? (
                    <EmptyState
                      title="No records found"
                      description="There are no records to display."
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pagination && (
        <div className="border-t border-border">{pagination}</div>
      )}
    </div>
  );
}
