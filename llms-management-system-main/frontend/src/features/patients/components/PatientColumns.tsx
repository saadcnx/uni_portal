"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDate, formatDateTime } from "@/lib/format";
import { ROLES, type Role } from "@/constants/roles";
import { cn } from "@/lib/utils";
import type { Gender, Patient } from "../types";

export interface PatientColumnsOptions {
  userRole?: Role | null;
  onView?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDeactivate?: (patient: Patient) => void;
}

const GENDER_CONFIG: Record<
  Gender,
  { label: string; className: string }
> = {
  MALE: {
    label: "Male",
    className: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  },
  FEMALE: {
    label: "Female",
    className: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  },
  OTHER: {
    label: "Other",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export interface AgeCalculation {
  value: number;
  unit: "years" | "months" | "days";
  text: string;
}

/**
 * Computes chronological age value and unit (years, months, or days) from date of birth.
 */
export function computeAgeFromDob(
  dateOfBirth: string | Date | null | undefined
): AgeCalculation | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  const birthDate = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (birthDate > currentDate) return null;

  let years = currentDate.getFullYear() - birthDate.getFullYear();
  let months = currentDate.getMonth() - birthDate.getMonth();
  let days = currentDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years >= 1) {
    return {
      value: years,
      unit: "years",
      text: `${years} ${years === 1 ? "yr" : "yrs"}`,
    };
  }

  if (months >= 1) {
    return {
      value: months,
      unit: "months",
      text: `${months} ${months === 1 ? "month" : "months"}`,
    };
  }

  return {
    value: days,
    unit: "days",
    text: `${days} ${days === 1 ? "day" : "days"}`,
  };
}

/**
 * Calculates current chronological age string (years, months, or days) from an ISO date of birth.
 */
export function calculateAge(
  dateOfBirth: string | Date | null | undefined
): string {
  const computed = computeAgeFromDob(dateOfBirth);
  return computed ? computed.text : "—";
}

/**
 * Re-render reasoning:
 * Column factory declared outside of components to ensure referential stability.
 * Role-based action filtering:
 * - View: available to all roles (Lab Admin, Doctor, Receptionist)
 * - Edit: Lab Admin and Receptionist
 * - Deactivate: Lab Admin only
 */
export function getPatientColumns(
  options?: PatientColumnsOptions
): ColumnDef<Patient>[] {
  const userRole = options?.userRole;

  const canEdit =
    userRole === ROLES.LAB_ADMIN || userRole === ROLES.RECEPTIONIST;
  const canDeactivate = userRole === ROLES.LAB_ADMIN;

  return [
    {
      accessorKey: "name",
      header: "Patient",
      enableSorting: true,
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={patient.name} size="sm" />
            <span className="font-medium text-foreground truncate">
              {patient.name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "patientCode",
      header: "Patient Code",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {row.original.patientCode}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums truncate">
          {row.original.phone || "—"}
        </span>
      ),
    },
    {
      accessorKey: "gender",
      header: "Gender",
      enableSorting: false,
      cell: ({ row }) => {
        const gender = row.original.gender;
        const config = GENDER_CONFIG[gender] ?? {
          label: gender,
          className: "bg-muted text-muted-foreground border-border",
        };

        return (
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border",
              config.className
            )}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dateOfBirth",
      header: "Age",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums whitespace-nowrap">
          {calculateAge(row.original.dateOfBirth)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Registered",
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <div className="flex flex-col tabular-nums">
            <span className="text-foreground text-sm font-medium whitespace-nowrap">
              {formatDate(date)}
            </span>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {formatDateTime(date, "h:mm a")}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const patient = row.original;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md size-8 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors"
                aria-label={`Actions for ${patient.name}`}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {/* View details - available for all roles */}
                <DropdownMenuItem
                  render={<Link href={`/patients/${patient.id}`} prefetch={true} />}
                  onClick={() => options?.onView?.(patient)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 size-4" />
                  View patient
                </DropdownMenuItem>

                {/* Edit - Lab Admin and Receptionist */}
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => options?.onEdit?.(patient)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit patient
                  </DropdownMenuItem>
                )}

                {/* Deactivate - Lab Admin only */}
                {canDeactivate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => options?.onDeactivate?.(patient)}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Deactivate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export const patientColumns: ColumnDef<Patient>[] = getPatientColumns();
