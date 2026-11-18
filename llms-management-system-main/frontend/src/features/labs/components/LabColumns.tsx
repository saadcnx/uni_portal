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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDate } from "@/lib/format";
import type { Lab } from "../types";

export interface LabColumnsOptions {
  onEdit?: (lab: Lab) => void;
  onToggleStatus?: (lab: Lab) => void;
}

/**
 * Re-render reasoning:
 * Column factory declared outside of any React component to ensure referential stability.
 * When options are omitted, defaults to an inert action set.
 */
export function getLabColumns(options?: LabColumnsOptions): ColumnDef<Lab>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => {
        const lab = row.original;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={lab.name} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-foreground truncate">
                {lab.name}
              </span>
              {lab.slug && (
                <span className="text-xs text-muted-foreground truncate">
                  {lab.slug}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "contactEmail",
      header: "Contact Email",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate">
          {row.original.contactEmail || "-"}
        </span>
      ),
    },
    {
      accessorKey: "contactPhone",
      header: "Phone",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums truncate">
          {row.original.contactPhone || "-"}
        </span>
      ),
    },
    {
      accessorKey: "userCount",
      header: "Users",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-foreground">
          {row.original.userCount ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        const lab = row.original;
        const isActive = lab.status === "ACTIVE";

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md size-8 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors"
                aria-label={`Actions for ${lab.name}`}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => options?.onEdit?.(lab)}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 size-4" />
                  Edit lab
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isActive ? (
                  <DropdownMenuItem
                    onClick={() => options?.onToggleStatus?.(lab)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <PowerOff className="mr-2 size-4" />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => options?.onToggleStatus?.(lab)}
                    className="text-success focus:text-success cursor-pointer"
                  >
                    <Power className="mr-2 size-4" />
                    Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

/**
 * Static inert column definitions exported for standard table use.
 */
export const labColumns: ColumnDef<Lab>[] = getLabColumns();
