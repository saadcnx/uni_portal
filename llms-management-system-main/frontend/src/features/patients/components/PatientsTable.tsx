"use client";

import * as React from "react";
import { type SortingState, type OnChangeFn } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { useAuthStore } from "@/stores/auth.store";
import { getPatientColumns } from "./PatientColumns";
import type { Patient } from "../types";
import type { Role } from "@/constants/roles";

export interface PatientsTableProps {
  data: Patient[];
  userRole?: Role | null;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: React.ReactNode;
  emptyState?: React.ReactNode;
  onView?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDeactivate?: (patient: Patient) => void;
}

/**
 * Re-render reasoning:
 * PatientsTable memoizes table columns based on user role and action callbacks.
 * TanStack Table remains decoupled from parent state, rendering updates efficiently.
 */
export function PatientsTable({
  data,
  userRole: propUserRole,
  isLoading,
  isFetching,
  isError,
  onRetry,
  sorting,
  onSortingChange,
  pagination,
  emptyState,
  onView,
  onEdit,
  onDeactivate,
}: PatientsTableProps) {
  const storeUserRole = useAuthStore((s) => s.user?.role);
  const userRole = propUserRole ?? storeUserRole;

  const columns = React.useMemo(() => {
    return getPatientColumns({ userRole, onView, onEdit, onDeactivate });
  }, [userRole, onView, onEdit, onDeactivate]);

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
