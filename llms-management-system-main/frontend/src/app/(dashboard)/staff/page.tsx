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
import { useAuthStore } from "@/stores/auth.store";
import { useTableParams } from "@/hooks/use-table-params";
import { useUsers, useUpdateUser } from "@/features/users/hooks";
import { UsersTable } from "@/features/users/components/UsersTable";
import type { User } from "@/features/users/types";

// PERFORMANCE.md section 5: Heavy libraries and dialogs use next/dynamic
const ConfirmDialog = dynamic(
  () =>
    import("@/components/shared/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false }
);

const UserFormDialog = dynamic(
  () =>
    import("@/features/users/components/UserFormDialog").then(
      (mod) => mod.UserFormDialog
    ),
  { ssr: false }
);

/**
 * Re-render reasoning:
 * 1. StaffContent isolates URL state subscriptions (useTableParams) and TanStack Query (useUsers).
 * 2. Scope "lab" omits the organization column since all staff belong to the current laboratory.
 * 3. Search and role filters trigger shallow URL state updates and preserve previous data during fetch.
 * 4. Current user self-protection prevents self-deactivation.
 */
function StaffContent() {
  const currentUserId = useAuthStore((state) => state.user?.id);

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
      role: parseAsString.withDefault(""),
    },
  });

  const role = (filters.role as string) || "";
  const hasActiveFilters = Boolean(search || role);

  // Staff query automatically scoped to lab admin's tenant on the backend
  const { data, isLoading, isFetching, isError, refetch } = useUsers({
    page,
    limit,
    search: search || undefined,
    role: role || undefined,
    sort: sort || undefined,
  });

  // Modal dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<User | null>(null);

  const updateUserMutation = useUpdateUser();

  const handleAddStaff = useCallback(() => {
    setSelectedUser(null);
    setFormDialogOpen(true);
  }, []);

  const handleEditStaff = useCallback((user: User) => {
    setSelectedUser(user);
    setFormDialogOpen(true);
  }, []);

  const handleToggleStatusClick = useCallback(
    (user: User) => {
      // Disallow self deactivation
      if (currentUserId && user.id === currentUserId) {
        toast.error("You cannot deactivate your own account");
        return;
      }
      setStatusUser(user);
      setStatusDialogOpen(true);
    },
    [currentUserId]
  );

  const handleConfirmToggleStatus = async () => {
    if (!statusUser) return;
    const isDeactivating = statusUser.isActive;

    updateUserMutation.mutate(
      {
        id: statusUser.id,
        data: { isActive: !isDeactivating },
      },
      {
        onSuccess: (updated) => {
          toast.success(
            isDeactivating
              ? `Staff member "${updated.name}" deactivated successfully`
              : `Staff member "${updated.name}" activated successfully`
          );
          setStatusDialogOpen(false);
          setStatusUser(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update staff status");
        },
      }
    );
  };

  const staff = data?.data ?? [];
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
        title="Staff"
        description="Manage doctors and receptionists for your laboratory"
        actions={
          <Button onClick={handleAddStaff} className="gap-2">
            <Plus className="size-4" />
            Add staff
          </Button>
        }
      />

      {/* Search and Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search staff by name or email..."
            isFetching={isFetching}
            className="w-full sm:max-w-xs"
          />

          <Select
            value={role || "ALL"}
            onValueChange={(val) => {
              setFilter("role", val === "ALL" ? "" : val);
            }}
          >
            <SelectTrigger
              className="w-full sm:w-[160px] h-9 text-sm"
              aria-label="Filter by role"
            >
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value={ROLES.DOCTOR}>Doctor</SelectItem>
              <SelectItem value={ROLES.RECEPTIONIST}>Receptionist</SelectItem>
              <SelectItem value={ROLES.LAB_ADMIN}>Lab Admin</SelectItem>
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

      {/* Staff Data Table */}
      <UsersTable
        scope="lab"
        data={staff}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => refetch()}
        sorting={sorting}
        onSortingChange={onSortingChange}
        onEdit={handleEditStaff}
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
              title="No matching staff"
              description="No staff members matched your search or role filters."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No staff found"
              description="No staff accounts have been added to your laboratory yet."
              action={
                <Button size="sm" onClick={handleAddStaff} className="gap-2">
                  <Plus className="size-4" />
                  Add staff
                </Button>
              }
            />
          )
        }
      />

      {/* Staff Form Dialog (Create and Edit) */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
        scope="lab"
      />

      {/* Activate / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open);
          if (!open) setStatusUser(null);
        }}
        title={
          statusUser?.isActive
            ? `Deactivate ${statusUser.name}?`
            : `Activate ${statusUser?.name}?`
        }
        description={
          statusUser?.isActive
            ? "Deactivating this staff member will immediately revoke their access to the system. You can reactivate them at any time."
            : "Activating this staff member will restore their access to the system."
        }
        confirmLabel={
          statusUser?.isActive ? "Deactivate Staff" : "Activate Staff"
        }
        destructive={Boolean(statusUser?.isActive)}
        isPending={updateUserMutation.isPending}
        onConfirm={handleConfirmToggleStatus}
      />
    </div>
  );
}

export default function StaffPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.LAB_ADMIN]}>
      <Suspense fallback={<TableSkeleton rowCount={5} columnCount={5} />}>
        <StaffContent />
      </Suspense>
    </RoleGuard>
  );
}
