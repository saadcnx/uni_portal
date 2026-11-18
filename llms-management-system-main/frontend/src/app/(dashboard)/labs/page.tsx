"use client";

import * as React from "react";
import { Suspense, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { parseAsString } from "nuqs";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
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
import { useTableParams } from "@/hooks/use-table-params";
import { useLabs, useUpdateLab } from "@/features/labs/hooks";
import { LabsTable } from "@/features/labs/components/LabsTable";
import type { Lab, TenantStatus } from "@/features/labs/types";

// PERFORMANCE.md section 5: Heavy libraries and dialogs use next/dynamic
const ConfirmDialog = dynamic(
  () =>
    import("@/components/shared/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false }
);

const LabFormDialog = dynamic(
  () =>
    import("@/features/labs/components/LabFormDialog").then(
      (mod) => mod.LabFormDialog
    ),
  { ssr: false }
);

/**
 * Re-render reasoning:
 * 1. LabsContent isolates URL state subscriptions (useTableParams) and TanStack Query (useLabs).
 * 2. Form and confirmation dialog states are isolated locally to modal triggers.
 * 3. Stable callbacks (handleAddLab, handleEditLab, handleToggleStatusClick) prevent unnecessary
 *    table header/column recalculations on re-render.
 */
function LabsContent() {
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
      status: parseAsString.withDefault(""),
    },
  });

  const status = (filters.status as string) || "";
  const hasActiveFilters = Boolean(search || status);

  // Labs list query with keepPreviousData
  const { data, isLoading, isFetching, isError, refetch } = useLabs({
    page,
    limit,
    search: search || undefined,
    status: status || undefined,
    sort: sort || undefined,
  });

  // Dialog state for create / edit
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);

  // Dialog state for activate / deactivate
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusLab, setStatusLab] = useState<Lab | null>(null);

  const updateLabMutation = useUpdateLab();

  const handleAddLab = useCallback(() => {
    setSelectedLab(null);
    setFormDialogOpen(true);
  }, []);

  const handleEditLab = useCallback((lab: Lab) => {
    setSelectedLab(lab);
    setFormDialogOpen(true);
  }, []);

  const handleToggleStatusClick = useCallback((lab: Lab) => {
    setStatusLab(lab);
    setStatusDialogOpen(true);
  }, []);

  const handleConfirmToggleStatus = async () => {
    if (!statusLab) return;
    const isDeactivating = statusLab.status === "ACTIVE";
    const nextStatus: TenantStatus = isDeactivating ? "INACTIVE" : "ACTIVE";

    updateLabMutation.mutate(
      {
        id: statusLab.id,
        data: { status: nextStatus },
      },
      {
        onSuccess: (updated) => {
          toast.success(
            isDeactivating
              ? `Lab "${updated.name}" deactivated successfully`
              : `Lab "${updated.name}" activated successfully`
          );
          setStatusDialogOpen(false);
          setStatusLab(null);
        },
      }
    );
  };

  const labs = data?.data ?? [];
  const meta = data?.meta ?? {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  return (
    <div className="space-y-6">
      {/* Page Header with primary Add lab action */}
      <PageHeader
        title="Labs"
        description="Manage laboratory organizations and administrative accounts"
        actions={
          <Button onClick={handleAddLab} className="gap-2">
            <Plus className="size-4" />
            Add lab
          </Button>
        }
      />

      {/* Search and Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search labs by name..."
            isFetching={isFetching}
            className="w-full sm:max-w-xs"
          />

          <Select
            value={status || "ALL"}
            onValueChange={(val) => {
              setFilter("status", val === "ALL" ? "" : val);
            }}
          >
            <SelectTrigger
              className="w-full sm:w-[150px] h-9 text-sm"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
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
              Reset filters
            </Button>
          )}
        </div>
      </div>

      {/* Labs Data Table */}
      <LabsTable
        data={labs}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => refetch()}
        sorting={sorting}
        onSortingChange={onSortingChange}
        onEdit={handleEditLab}
        onToggleStatus={handleToggleStatusClick}
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
              title="No matching labs"
              description="No laboratories matched your search or status filters."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No labs found"
              description="No diagnostic laboratories have been registered yet."
              action={
                <Button size="sm" onClick={handleAddLab} className="gap-2">
                  <Plus className="size-4" />
                  Add lab
                </Button>
              }
            />
          )
        }
      />

      {/* Lab Form Dialog (Create and Edit) */}
      <LabFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setSelectedLab(null);
        }}
        lab={selectedLab}
      />

      {/* Activate / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open);
          if (!open) setStatusLab(null);
        }}
        title={
          statusLab?.status === "ACTIVE"
            ? `Deactivate ${statusLab.name}?`
            : `Activate ${statusLab?.name}?`
        }
        description={
          statusLab?.status === "ACTIVE"
            ? "Deactivating this laboratory will immediately revoke access for all associated users. You can reactivate it at any time."
            : "Activating this laboratory will restore system access for all its administrators and staff."
        }
        confirmLabel={
          statusLab?.status === "ACTIVE" ? "Deactivate Lab" : "Activate Lab"
        }
        destructive={statusLab?.status === "ACTIVE"}
        isPending={updateLabMutation.isPending}
        onConfirm={handleConfirmToggleStatus}
      />
    </div>
  );
}

export default function LabsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
      <Suspense fallback={<TableSkeleton rowCount={5} columnCount={7} />}>
        <LabsContent />
      </Suspense>
    </RoleGuard>
  );
}
