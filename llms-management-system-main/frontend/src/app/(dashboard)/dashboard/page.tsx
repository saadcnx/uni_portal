"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  CheckCircle2,
  Users,
  UserRound,
  CalendarDays,
  UserCheck,
  UserPlus,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/constants/roles";
import { useUserRole } from "@/stores/auth.store";
import { useDashboardStats } from "@/features/dashboard/hooks";
import { RecentPatientsTable } from "@/features/dashboard/components/RecentPatientsTable";
import type {
  SuperAdminDashboardStats,
  LabAdminDashboardStats,
  DoctorDashboardStats,
  ReceptionistDashboardStats,
} from "@/features/dashboard/types";

function ChartCardFallback() {
  return (
    <Card className="rounded-xl border border-border bg-card p-5 shadow-none flex flex-col justify-between h-[360px]">
      <div className="space-y-1 mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="h-[280px] w-full flex items-end justify-between gap-2 p-4">
        <Skeleton className="w-full h-1/3 rounded-t-sm" />
        <Skeleton className="w-full h-2/3 rounded-t-sm" />
        <Skeleton className="w-full h-1/2 rounded-t-sm" />
        <Skeleton className="w-full h-4/5 rounded-t-sm" />
        <Skeleton className="w-full h-3/5 rounded-t-sm" />
        <Skeleton className="w-full h-5/6 rounded-t-sm" />
        <Skeleton className="w-full h-2/3 rounded-t-sm" />
      </div>
    </Card>
  );
}

const RegistrationsBarChart = dynamic(
  () =>
    import("@/features/dashboard/components/RegistrationsBarChart").then(
      (mod) => mod.RegistrationsBarChart
    ),
  {
    loading: () => <ChartCardFallback />,
    ssr: false,
  }
);

const BreakdownBars = dynamic(
  () =>
    import("@/features/dashboard/components/BreakdownBars").then(
      (mod) => mod.BreakdownBars
    ),
  {
    loading: () => <ChartCardFallback />,
    ssr: false,
  }
);

const SuperAdminCharts = dynamic(
  () =>
    import("@/features/dashboard/components/SuperAdminCharts").then(
      (mod) => mod.SuperAdminCharts
    ),
  {
    loading: () => (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCardFallback />
        </div>
        <div className="lg:col-span-1">
          <ChartCardFallback />
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * Re-render reasoning:
 * 1. RoleGuard subscribes strictly to the narrow useUserRole() selector.
 * 2. Heavy Recharts visualization bundles load lazily via next/dynamic with fixed-height skeletons (PERFORMANCE.md Section 5).
 * 3. Fixed heights on ChartCard and TableSkeleton eliminate Cumulative Layout Shift (CLS < 0.1).
 * 4. StaleTime of 60 seconds caches metrics and eliminates redundant network fetches.
 */
export default function DashboardPage() {
  const role = useUserRole();
  const [days, setDays] = useState<number>(7);
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardStats({ days });

  const renderStatCards = () => {
    if (isLoading) {
      const skeletonCount =
        role === ROLES.DOCTOR || role === ROLES.RECEPTIONIST ? 2 : 3;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertCircle className="size-4" />
          <AlertTitle className="font-semibold">
            Failed to load statistics
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p className="text-sm">
              {error?.message ||
                "An unexpected error occurred while loading dashboard metrics."}
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (!data) {
      return null;
    }

    switch (role) {
      case ROLES.SUPER_ADMIN: {
        const stats = data as SuperAdminDashboardStats;
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Labs"
              value={stats.cards?.totalLabs ?? 0}
              icon={Building2}
              hint="Registered laboratory facilities"
            />
            <StatCard
              label="Active Labs"
              value={stats.cards?.activeLabs ?? 0}
              icon={CheckCircle2}
              hint="Currently operational labs"
            />
            <StatCard
              label="Total Users"
              value={stats.cards?.totalUsers ?? 0}
              icon={Users}
              hint="All platform accounts across labs"
            />
          </div>
        );
      }

      case ROLES.LAB_ADMIN: {
        const stats = data as LabAdminDashboardStats;
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Patients"
              value={stats.cards?.totalPatients ?? 0}
              icon={UserRound}
              hint="All registered patient records"
            />
            <StatCard
              label="Patients Today"
              value={stats.cards?.patientsToday ?? 0}
              icon={CalendarDays}
              hint="Registered during today's shift"
            />
            <StatCard
              label="Total Staff"
              value={stats.cards?.totalStaff ?? 0}
              icon={UserCheck}
              hint="Active lab doctors and receptionists"
            />
          </div>
        );
      }

      case ROLES.DOCTOR: {
        const stats = data as DoctorDashboardStats;
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Patients"
              value={stats.cards?.totalPatients ?? 0}
              icon={UserRound}
              hint="All lab patient records"
            />
            <StatCard
              label="Patients Today"
              value={stats.cards?.patientsToday ?? 0}
              icon={CalendarDays}
              hint="Registered during today's shift"
            />
          </div>
        );
      }

      case ROLES.RECEPTIONIST: {
        const stats = data as ReceptionistDashboardStats;
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Registered Today"
              value={stats.cards?.registeredToday ?? 0}
              icon={UserPlus}
              hint="Patients registered by you today"
            />
            <StatCard
              label="Total Patients"
              value={stats.cards?.totalPatients ?? 0}
              icon={UserRound}
              hint="Overall lab patient database"
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderChartsAndActivity = () => {
    switch (role) {
      case ROLES.SUPER_ADMIN: {
        const stats = data as SuperAdminDashboardStats | undefined;
        return (
          <SuperAdminCharts
            stats={stats}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
        );
      }

      case ROLES.LAB_ADMIN:
      case ROLES.DOCTOR: {
        const stats = data as
          | LabAdminDashboardStats
          | DoctorDashboardStats
          | undefined;

        const genderItems = (stats?.charts?.genderBreakdown || []).map((g) => ({
          label:
            g.gender === "MALE"
              ? "Male"
              : g.gender === "FEMALE"
                ? "Female"
                : g.gender || "Other",
          count: g.count,
          color:
            g.gender === "MALE"
              ? "bg-chart-1"
              : g.gender === "FEMALE"
                ? "bg-chart-2"
                : "bg-chart-3",
        }));

        return (
          <div className="space-y-6">
            {/* Chart row: two thirds bar chart, one third breakdown bars */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RegistrationsBarChart
                  data={stats?.charts?.registrations ?? stats?.charts?.registrationsLast7Days}
                  days={days}
                  onDaysChange={setDays}
                  isLoading={isLoading || isFetching}
                  isError={isError}
                  onRetry={() => refetch()}
                />
              </div>
              <div className="lg:col-span-1">
                <BreakdownBars
                  title="Gender Breakdown"
                  description="Patient distribution by gender"
                  items={genderItems}
                  isLoading={isLoading}
                  isError={isError}
                  onRetry={() => refetch()}
                  emptyTitle="No gender data"
                  emptyDescription="No registered patient gender statistics."
                />
              </div>
            </div>

            {/* Row 3: Recent Patients Table */}
            <RecentPatientsTable
              patients={stats?.recentPatients}
              isLoading={isLoading}
            />
          </div>
        );
      }

      case ROLES.RECEPTIONIST: {
        const stats = data as ReceptionistDashboardStats | undefined;
        return (
          <div className="space-y-6">
            {/* Receptionist chart row: registrations */}
            <RegistrationsBarChart
              data={stats?.charts?.registrations ?? stats?.charts?.registrationsLast7Days}
              days={days}
              onDaysChange={setDays}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
            />

            {/* Row 3: Recent Patients Table */}
            <RecentPatientsTable
              patients={stats?.recentPatients}
              isLoading={isLoading}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <RoleGuard
      allowedRoles={[
        ROLES.SUPER_ADMIN,
        ROLES.LAB_ADMIN,
        ROLES.DOCTOR,
        ROLES.RECEPTIONIST,
      ]}
    >
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview and performance statistics"
        />

        {/* Row 1: Stat Cards */}
        {renderStatCards()}

        {/* Row 2 (Charts) & Row 3 (Recent Activity) */}
        {renderChartsAndActivity()}
      </div>
    </RoleGuard>
  );
}
