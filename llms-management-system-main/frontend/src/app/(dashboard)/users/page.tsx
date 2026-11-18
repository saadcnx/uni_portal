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
import { useLabs } from "@/features/labs/hooks";
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
 * 1. UsersContent isolates URL state subscriptions (useTableParams) and TanStack Query (useUsers).
 * 2. Form and confirmation dialog states are isolated locally to modal triggers.
 * 3. Scope "all" renders the full system-wide table including the Lab organization column.
 * 4. Current user self-protection prevents self-deactivation.
 */
function UsersContent() {
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
      tenantId: parseAsString.withDefault(""),
    },
  });

  const role = (filters.role as string) || "";
  const tenantId = (filters.tenantId as string) || "";
  const hasActiveFilters = Boolean(search || role || tenantId);

  // Labs list for Super Admin tenant filter dropdown
  const { data: labsData } = useLabs({ limit: 100 });
  const labs = labsData?.data ?? [];

  // Users list query with keepPreviousData
  const { data, isLoading, isFetching, isError, refetch } = useUsers({
    page,
    limit,
    search: search || undefined,
    role: role || undefined,
    tenantId: tenantId || undefined,
    sort: sort || undefined,
  });

  // Modal dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<User | null>(null);

  const updateUserMutation = useUpdateUser();

  const handleAddUser = useCallback(() => {
    setSelectedUser(null);
    setFormDialogOpen(true);
  }, []);

  const handleEditUser = useCallback((user: User) => {
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
              ? `User "${updated.name}" deactivated successfully`
              : `User "${updated.name}" activated successfully`
          );
          setStatusDialogOpen(false);
          setStatusUser(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update user status");
        },
      }
    );
  };

  const users = data?.data ?? [];
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
        title="Users"
        description="Manage system user accounts and platform access"
        actions={
          <Button onClick={handleAddUser} className="gap-2">
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />

      {/* Search and Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search users by name or email..."
            isFetching={isFetching}
            className="w-full sm:max-w-xs"
          />

          <Select
            value={tenantId || "ALL"}
            onValueChange={(val) => {
              setFilter("tenantId", val === "ALL" ? "" : val);
            }}
          >
            <SelectTrigger
              className="w-full sm:w-[180px] h-9 text-sm"
              aria-label="Filter by lab"
            >
              <SelectValue placeholder="All labs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All labs</SelectItem>
              {labs.map((lab) => (
                <SelectItem key={lab.id} value={lab.id}>
                  {lab.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              <SelectItem value={ROLES.SUPER_ADMIN}>Super Admin</SelectItem>
              <SelectItem value={ROLES.LAB_ADMIN}>Lab Admin</SelectItem>
              <SelectItem value={ROLES.DOCTOR}>Doctor</SelectItem>
              <SelectItem value={ROLES.RECEPTIONIST}>Receptionist</SelectItem>
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

      {/* Users Data Table */}
      <UsersTable
        scope="all"
        data={users}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => refetch()}
        sorting={sorting}
        onSortingChange={onSortingChange}
        onEdit={handleEditUser}
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
              title="No matching users"
              description="No user accounts matched your search or filter criteria."
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="no-data"
              title="No users found"
              description="No user accounts have been registered yet."
              action={
                <Button size="sm" onClick={handleAddUser} className="gap-2">
                  <Plus className="size-4" />
                  Add user
                </Button>
              }
            />
          )
        }
      />

      {/* User Form Dialog (Create and Edit) */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
        scope="all"
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
            ? "Deactivating this user will immediately revoke their access to the system. You can reactivate them at any time."
            : "Activating this user will restore their access to the system."
        }
        confirmLabel={
          statusUser?.isActive ? "Deactivate User" : "Activate User"
        }
        destructive={Boolean(statusUser?.isActive)}
        isPending={updateUserMutation.isPending}
        onConfirm={handleConfirmToggleStatus}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
      <Suspense fallback={<TableSkeleton rowCount={5} columnCount={6} />}>
        <UsersContent />
      </Suspense>
    </RoleGuard>
  );
}
