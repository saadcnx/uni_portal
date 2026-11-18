"use client";

import * as React from "react";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { can } from "@/constants/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ApiError } from "@/types/api";
import { usePatient, useDeactivatePatient } from "../hooks";
import { calculateAge } from "./PatientColumns";
import type { Gender } from "../types";

// PERFORMANCE.md section 5: Heavy libraries and dialogs use next/dynamic
const ConfirmDialog = dynamic(
  () =>
    import("@/components/shared/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false }
);

const PatientFormDialog = dynamic(
  () =>
    import("./PatientFormDialog").then((mod) => mod.PatientFormDialog),
  { ssr: false }
);

export interface PatientDetailsProps {
  patientId?: string;
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

export function PatientDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Skeleton */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/patients" />}>
              Patients
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="h-4 w-20" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Card Skeleton */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 sm:size-20 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 sm:w-64" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </Card>

      {/* Information Card Skeleton */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * PatientDetails component
 * Displays full demographic, contact, and registration information for a patient.
 * Role-aware actions:
 * - Lab Admin: Edit and Deactivate
 * - Receptionist: Edit
 * - Doctor: View-only (no action buttons rendered)
 */
export function PatientDetails({ patientId: propPatientId }: PatientDetailsProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const patientId = propPatientId || params?.id || "";

  const userRole = useAuthStore((state) => state.user?.role);
  const canEdit = can(userRole, "patient:update");
  const canDeactivate = can(userRole, "patient:delete");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const {
    data: patient,
    isLoading,
    isError,
    error,
    refetch,
  } = usePatient(patientId, {
    retry: (failureCount, err) => {
      // Do not retry on 404 (patient not found or different lab tenant)
      if (err?.statusCode === 404) return false;
      return failureCount < 1;
    },
  });

  const deactivatePatientMutation = useDeactivatePatient();

  const handleConfirmDeactivate = async () => {
    if (!patient) return;

    deactivatePatientMutation.mutate(patient.id, {
      onSuccess: () => {
        toast.success(`Patient "${patient.name}" deactivated successfully`);
        setDeactivateDialogOpen(false);
        router.push("/patients");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to deactivate patient");
      },
    });
  };

  // 1. Loading state with skeleton fallback
  if (isLoading) {
    return <PatientDetailsSkeleton />;
  }

  // 2. 404 Not Found state (non-existent patient or another lab's patient via tenant isolation)
  const isNotFound =
    (error instanceof ApiError && error.statusCode === 404) ||
    (error as { statusCode?: number })?.statusCode === 404 ||
    (error as { status?: number })?.status === 404;

  if (isNotFound) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/patients" />}>
                Patients
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Patient</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="py-12">
          <EmptyState
            title="Patient not found"
            description="The requested patient record could not be found or belongs to another laboratory."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/patients")}
                className="gap-2 cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                Back to patients
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // 3. Other errors: show Alert with Retry
  if (isError || !patient) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/patients" />}>
                Patients
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Error</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Alert variant="destructive" className="max-w-2xl border-destructive/30">
          <AlertCircle className="size-4" />
          <AlertTitle className="font-semibold">Failed to load patient</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p className="text-sm text-destructive/90">
              {error?.message ||
                "An unexpected error occurred while loading patient details."}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/patients")}
                className="gap-2 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                Back to patients
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const genderConfig = GENDER_CONFIG[patient.gender] ?? {
    label: patient.gender,
    className: "bg-muted text-muted-foreground border-border",
  };

  const age = calculateAge(patient.dateOfBirth);
  const registeredBy =
    typeof patient.createdBy === "object" && patient.createdBy !== null
      ? (patient.createdBy as { name?: string }).name || "—"
      : patient.createdBy || "—";

  return (
    <div className="space-y-6">
      {/* Breadcrumb: Patients, patient code */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/patients" />}>
              Patients
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono font-medium">
              {patient.patientCode}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar
              name={patient.name}
              size="lg"
              className="size-16 sm:size-20 text-xl sm:text-2xl shrink-0"
            />
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                {patient.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  {patient.patientCode}
                </span>
                <StatusBadge status={patient.isActive ?? true} />
              </div>
            </div>
          </div>

          {/* Role-aware Action buttons: Doctor sees no action buttons */}
          {(canEdit || (canDeactivate && patient.isActive)) && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )}

              {canDeactivate && patient.isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeactivateDialogOpen(true)}
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Deactivate
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Information Card (Two-column grid) */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">
            Patient Information
          </CardTitle>
          <CardDescription>
            Demographics, contact info, and registration details
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Phone */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Phone</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {patient.phone || "—"}
              </p>
            </div>

            {/* 2. Gender */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Gender</p>
              <div>
                <Badge
                  variant="outline"
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border",
                    genderConfig.className
                  )}
                >
                  {genderConfig.label}
                </Badge>
              </div>
            </div>

            {/* 3. Date of birth and age */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Date of birth & Age
              </p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {formatDate(patient.dateOfBirth)}{" "}
                <span className="text-muted-foreground font-normal">
                  ({age})
                </span>
              </p>
            </div>

            {/* 4. Address */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Address
              </p>
              <p className="text-sm font-medium text-foreground">
                {patient.address || "—"}
              </p>
            </div>

            {/* 5. Registered by */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Registered by
              </p>
              <div className="flex items-center gap-2">
                {registeredBy !== "—" && (
                  <UserAvatar name={registeredBy} size="sm" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {registeredBy}
                </p>
              </div>
            </div>

            {/* 6. Registered date & time */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Registered on
              </p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {formatDateTime(patient.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog (PatientFormDialog) */}
      <PatientFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        patient={patient}
      />

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title={`Deactivate ${patient.name}?`}
        description="Deactivating this patient will remove them from active listings. Patient records and historical data are safely preserved."
        confirmLabel="Deactivate Patient"
        destructive={true}
        isPending={deactivatePatientMutation.isPending}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
