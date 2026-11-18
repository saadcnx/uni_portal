"use client";

import * as React from "react";
import { type SortingState, type OnChangeFn } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { getLabColumns, labColumns } from "./LabColumns";
import type { Lab } from "../types";

export interface LabsTableProps {
  data: Lab[];
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: React.ReactNode;
  emptyState?: React.ReactNode;
  onEdit?: (lab: Lab) => void;
  onToggleStatus?: (lab: Lab) => void;
}

/**
 * Re-render reasoning:
 * LabsTable memoizes table columns based on stable edit and status-toggle callbacks.
 * TanStack Table remains decoupled from parent state, rendering updates efficiently.
 */
export function LabsTable({
  data,
  isLoading,
  isFetching,
  isError,
  onRetry,
  sorting,
  onSortingChange,
  pagination,
  emptyState,
  onEdit,
  onToggleStatus,
}: LabsTableProps) {
  const columns = React.useMemo(() => {
    if (onEdit || onToggleStatus) {
      return getLabColumns({ onEdit, onToggleStatus });
    }
    return labColumns;
  }, [onEdit, onToggleStatus]);

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      onRetry={onRetry}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      emptyState={emptyState}
    />
  );
}
