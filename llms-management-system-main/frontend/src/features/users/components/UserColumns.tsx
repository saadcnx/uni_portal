"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDate } from "@/lib/format";
import type { User, UserScope } from "../types";

export interface UserColumnsOptions {
  scope?: UserScope;
  currentUserId?: string;
  onEdit?: (user: User) => void;
  onToggleStatus?: (user: User) => void;
}

/**
 * Re-render reasoning:
 * Column factory declared outside of components to ensure referential stability.
 * When options are omitted, defaults to scope="all" and inert action triggers.
 */
export function getUserColumns(
  options?: UserColumnsOptions
): ColumnDef<User>[] {
  const scope = options?.scope ?? "all";

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "User",
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-foreground truncate">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      enableSorting: true,
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
  ];

  // Lab column is only included for Super Admin ("all" scope)
  if (scope !== "lab") {
    columns.push({
      accessorKey: "tenantName",
      header: "Lab",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate">
          {row.original.tenantName || "—"}
        </span>
      ),
    });
  }

  columns.push(
    {
      accessorKey: "isActive",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.isActive} />,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = Boolean(
          options?.currentUserId && options.currentUserId === user.id
        );
        const isActive = user.isActive;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md size-8 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors"
                aria-label={`Actions for ${user.name}`}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => options?.onEdit?.(user)}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 size-4" />
                  {scope === "lab" ? "Edit staff" : "Edit user"}
                </DropdownMenuItem>

                {/* A user cannot deactivate themselves, so hide that action for the current user */}
                {!isSelf && (
                  <>
                    <DropdownMenuSeparator />
                    {isActive ? (
                      <DropdownMenuItem
                        onClick={() => options?.onToggleStatus?.(user)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <PowerOff className="mr-2 size-4" />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => options?.onToggleStatus?.(user)}
                        className="text-success focus:text-success cursor-pointer"
                      >
                        <Power className="mr-2 size-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }
  );

  return columns;
}

export const allUserColumns: ColumnDef<User>[] = getUserColumns({
  scope: "all",
});
export const labUserColumns: ColumnDef<User>[] = getUserColumns({
  scope: "lab",
});
