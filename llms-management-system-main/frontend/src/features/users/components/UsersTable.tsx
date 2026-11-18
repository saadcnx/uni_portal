"use client";

import * as React from "react";
import { type SortingState, type OnChangeFn } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { useAuthStore } from "@/stores/auth.store";
import { getUserColumns } from "./UserColumns";
import type { User, UserScope } from "../types";

export interface UsersTableProps {
  data: User[];
  scope?: UserScope;
  currentUserId?: string;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: React.ReactNode;
  emptyState?: React.ReactNode;
  onEdit?: (user: User) => void;
  onToggleStatus?: (user: User) => void;
}

/**
 * Re-render reasoning:
 * UsersTable memoizes columns based on scope, currentUserId, and action callbacks.
 * Shared by both Super Admin Users page and Lab Admin Staff page.
 */
export function UsersTable({
  data,
  scope = "all",
  currentUserId: propCurrentUserId,
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
}: UsersTableProps) {
  const storeUserId = useAuthStore((s) => s.user?.id);
  const currentUserId = propCurrentUserId ?? storeUserId;

  const columns = React.useMemo(() => {
    return getUserColumns({ scope, currentUserId, onEdit, onToggleStatus });
  }, [scope, currentUserId, onEdit, onToggleStatus]);

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
