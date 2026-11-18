"use client";

import * as React from "react";
import { Suspense, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsString } from "nuqs";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ROLES } from "@/constants/roles";
import { can } from "@/constants/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { useTableParams } from "@/hooks/use-table-params";
import { usePatients, useDeactivatePatient } from "@/features/patients/hooks";
import { PatientsTable } from "@/features/patients/components/PatientsTable";
import type { Patient } from "@/features/patients/types";

// PERFORMANCE.md section 5: Heavy libraries and dialogs use next/dynamic
const ConfirmDialog = dynamic(
  () =>
    import("@/components/shared/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false }
);

const PatientFormDialog = dynamic(
  () =>
    import("@/features/patients/components/PatientFormDialog").then(
      (mod) => mod.PatientFormDialog
    ),
  { ssr: false }
);

/**
 * Re-render reasoning & Performance (PERFORMANCE.md sections 4 & 5):
 * 1. PatientsContent isolates URL query state subscriptions (useTableParams) and TanStack Query (usePatients).
 * 2. Next-page prefetch and keepPreviousData ensure seamless, unfragmented pagination.
 * 3. Search is debounced 300 ms and stored directly in the URL query string.
 * 4. Actions and buttons are strictly guarded by role:
 *    - Register button: rendered only when can(userRole, "patient:create").
 *    - Edit row action: rendered for roles with edit capability.
 *    - Deactivate row action: Lab Admin only, guarded by ConfirmDialog.
 */
function PatientsContent() {
  const userRole = useAuthStore((state) => state.user?.role);
  const canRegister = can(userRole, "patient:create");
  const router = useRouter();

  const queryClient = useQueryClient();

  const handleViewClick = useCallback(
    (patient: Patient) => {
      queryClient.setQueryData(queryKeys.patients.detail(patient.id), patient);
      router.push(`/patients/${patient.id}`);
    },
    [router, queryClient]
  );

  const {
    page,
    limit,
    search,
    sort,
    filters,
    sorting,
    onSortingChange,
    setPage,
    setLimit,
    setSearch,
    setFilter,
    resetFilters,
  } = useTableParams({
    defaultLimit: 20,
    defaultSort: "-createdAt",
    extraParsers: {
      gender: parseAsString.withDefault(""),
    },
  });

  const gender = (filters.gender as string) || "";
  const hasActiveFilters = Boolean(search || gender);

  // Paginated patients query with keepPreviousData and next-page prefetch
  const { data, isLoading, isFetching, isError, refetch } = usePatients({
    page,
    limit,
    search: search || undefined,
    gender: gender || undefined,
    sort: sort || undefined,
  });

  // Create / Edit modal state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleRegisterClick = useCallback(() => {
    setSelectedPatient(null);
    setFormDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setFormDialogOpen(true);
  }, []);

  // Deactivation confirmation modal state (Lab Admin only)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [patientToDeactivate, setPatientToDeactivate] =
    useState<Patient | null>(null);

  const deactivatePatientMutation = useDeactivatePatient();

  const handleDeactivateClick = useCallback((patient: Patient) => {
    setPatientToDeactivate(patient);
    setDeactivateDialogOpen(true);
  }, []);

  const handleConfirmDeactivate = async () => {
    if (!patientToDeactivate) return;

    deactivatePatientMutation.mutate(patientToDeactivate.id, {
      onSuccess: () => {
        toast.success(
          `Patient "${patientToDeactivate.name}" deactivated successfully`
        );
        setDeactivateDialogOpen(false);
        setPatientToDeactivate(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to deactivate patient");
      },
    });
  };

  const patients = data?.data ?? [];
  const meta = data?.meta ?? {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Patients"
        description="Manage patient records, demographics, and registration details"
        actions={
          canRegister ? (
            <Button className="gap-2 hover:cursor-pointer" onClick={handleRegisterClick}>
              <Plus className="size-4" />
              Register patient
            </Button>
          ) : undefined
        }
      />

      {/* Search and Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search by name or phone..."
            isFetching={isFetching}
            className="w-full sm:max-w-xs"
          />

          <Select
            value={gender || "ALL"}
            onValueChange={(val) => {
              setFilter("gender", val === "ALL" ? "" : val);
            }}
          >
            <SelectTrigger
              className="w-full sm:w-[150px] h-9 text-sm"
              aria-label="Filter by gender"
            >
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All genders</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground self-start sm:self-center"
            >
              <X className="mr-1.5 size-3.5" />
              Clear search
            </Button>
          )}
        </div>
      </div>

      {/* Patients Data Table */}
      <PatientsTable
        data={patients}
        userRole={userRole}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => refetch()}
        sorting={sorting}
        onSortingChange={onSortingChange}
        onView={handleViewClick}
        onEdit={handleEditClick}
        onDeactivate={handleDeactivateClick}
        pagination={
          <DataTablePagination
            page={page}
            limit={limit}
            total={meta.total}
            onPageChange={setPage}
            onLimitChange={setLimit}
            disabled={isFetching}
          />
        }
        emptyState={
          hasActiveFilters ? (
            <EmptyState
              variant="no-results"
              title="No matching patients"
              description="No patients matched your search or filter criteria."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No patients yet"
              description="No patients have been registered in your laboratory yet."
              action={
                canRegister ? (
                  <Button
                    size="sm"
                    className="gap-2 cursor-pointer"
                    onClick={handleRegisterClick}
                  >
                    <Plus className="size-4" />
                    Register patient
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />

      {/* Patient Create / Edit Dialog */}
      <PatientFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        patient={selectedPatient}
      />

      {/* Soft Delete / Deactivate Confirmation Dialog (Lab Admin only) */}
      <ConfirmDialog
        open={deactivateDialogOpen}
        onOpenChange={(open) => {
          setDeactivateDialogOpen(open);
          if (!open) setPatientToDeactivate(null);
        }}
        title={`Deactivate ${patientToDeactivate?.name}?`}
        description="Deactivating this patient will remove them from active listings. Patient records and historical data are safely preserved."
        confirmLabel="Deactivate Patient"
        destructive={true}
        isPending={deactivatePatientMutation.isPending}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}

export default function PatientsPage() {
  return (
    <RoleGuard
      allowedRoles={[ROLES.LAB_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}
    >
      <Suspense fallback={<TableSkeleton rowCount={5} columnCount={7} />}>
        <PatientsContent />
      </Suspense>
    </RoleGuard>
  );
}
