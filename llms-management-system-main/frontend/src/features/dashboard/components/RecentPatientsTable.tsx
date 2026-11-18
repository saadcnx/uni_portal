"use client";

import * as React from "react";
import { FolderOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { formatDate, formatDateTime } from "@/lib/format";
import type { RecentPatientItem } from "../types";

export interface RecentPatientsTableProps {
  patients?: RecentPatientItem[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Re-render reasoning:
 * Memoized to prevent re-rendering recent patients table when stat metrics refresh.
 * Adheres to DESIGN.md Section 6 & 8:
 * - 5 rows maximum
 * - Avatar (28px) plus patient name
 * - Patient code in JetBrains Mono font
 * - Relative registration timestamp
 * - EmptyState when empty
 * - Bordered rounded-xl container
 */
export const RecentPatientsTable = React.memo(function RecentPatientsTable({
  patients = [],
  isLoading = false,
}: RecentPatientsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-tight tracking-tight text-foreground">
            Recent Patients
          </h3>
          <p className="text-xs text-muted-foreground">
            Latest registered patients in your laboratory
          </p>
        </div>
        <TableSkeleton rowCount={5} columnCount={4} />
      </div>
    );
  }

  const isEmpty = !patients || patients.length === 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-tight tracking-tight text-foreground">
          Recent Patients
        </h3>
        <p className="text-xs text-muted-foreground">
          Latest registered patients in your laboratory
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isEmpty ? (
          <div className="py-8">
            <EmptyState
              icon={FolderOpen}
              title="No recent patients"
              description="No patients have been registered yet."
              variant="no-data"
              size="sm"
            />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="h-11 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground pl-4">
                  Patient
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Patient Code
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Gender
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground pr-4 text-right">
                  Registered
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.slice(0, 5).map((patient) => (
                <TableRow
                  key={patient.id}
                  className="h-11 hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="pl-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={patient.name} size="sm" />
                      <span className="font-medium text-sm text-foreground">
                        {patient.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {patient.patientCode}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground capitalize">
                    {patient.gender?.toLowerCase() || "-"}
                  </TableCell>
                  <TableCell className="pr-4 py-2 text-right text-xs whitespace-nowrap">
                    <div className="flex flex-col items-end tabular-nums">
                      <span className="text-foreground font-medium">
                        {formatDate(patient.createdAt)}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {formatDateTime(patient.createdAt, "h:mm a")}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
});
