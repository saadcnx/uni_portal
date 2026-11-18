"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/shared/ChartCard";
import { BreakdownBars, type BreakdownItem } from "./BreakdownBars";
import type { SuperAdminDashboardStats } from "../types";
import { ROLES } from "@/constants/roles";
import { parseISO, format, isValid } from "date-fns";

export interface SuperAdminChartsProps {
  stats?: SuperAdminDashboardStats;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

const labsChartConfig: ChartConfig = {
  count: {
    label: "Labs Created",
    color: "var(--color-chart-1)",
  },
};

const ROLE_DISPLAY_NAMES: Record<string, { label: string; color: string }> = {
  [ROLES.SUPER_ADMIN]: { label: "Super Admin", color: "bg-chart-4" },
  [ROLES.LAB_ADMIN]: { label: "Lab Admin", color: "bg-brand" },
  [ROLES.DOCTOR]: { label: "Doctor", color: "bg-chart-1" },
  [ROLES.RECEPTIONIST]: { label: "Receptionist", color: "bg-chart-2" },
};

function formatMonthLabel(monthStr: string): string {
  try {
    const parsed = parseISO(`${monthStr}-01`);
    if (isValid(parsed)) {
      return format(parsed, "MMM yyyy");
    }
  } catch {
    // fallback
  }
  return monthStr;
}

function formatMonthShort(monthStr: string): string {
  try {
    const parsed = parseISO(`${monthStr}-01`);
    if (isValid(parsed)) {
      return format(parsed, "MMM");
    }
  } catch {
    // fallback
  }
  return monthStr;
}

/**
 * Re-render reasoning:
 * Memoized to avoid re-rendering heavy visualization canvas when sibling state updates.
 * Adheres to DESIGN.md Section 8 (two thirds bar chart, one third breakdown bars).
 */
export const SuperAdminCharts = React.memo(function SuperAdminCharts({
  stats,
  isLoading = false,
  isError = false,
  onRetry,
  className,
}: SuperAdminChartsProps) {
  const labsData = React.useMemo(() => {
    return (stats?.charts?.labsByMonth || []).map((item) => ({
      ...item,
      displayMonth: formatMonthLabel(item.month),
      shortMonth: formatMonthShort(item.month),
    }));
  }, [stats?.charts?.labsByMonth]);

  const isLabsEmpty =
    !isLoading &&
    (labsData.length === 0 || labsData.every((item) => item.count === 0));

  const roleItems: BreakdownItem[] = React.useMemo(() => {
    return (stats?.charts?.usersByRole || []).map((item) => {
      const config = ROLE_DISPLAY_NAMES[item.role] || {
        label: item.role,
        color: "bg-chart-3",
      };
      return {
        label: config.label,
        count: item.count,
        color: config.color,
      };
    });
  }, [stats?.charts?.usersByRole]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 2/3 column: Labs Created Bar Chart */}
      <div className="lg:col-span-2">
        <ChartCard
          title="Labs Created"
          description="Monthly laboratory tenant registrations"
          period="Last 6 months"
          isLoading={isLoading}
          isEmpty={isLabsEmpty}
          emptyTitle="No labs created"
          emptyDescription="No laboratory tenant registrations recorded in this period."
          isError={isError}
          onRetry={onRetry}
          height={280}
          className={className}
        >
          <ChartContainer config={labsChartConfig} className="h-[280px] w-full">
            <BarChart
              data={labsData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                className="stroke-border/40"
              />
              <XAxis
                dataKey="shortMonth"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs text-muted-foreground select-none"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                className="text-xs text-muted-foreground select-none"
              />
              <ChartTooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    labelKey="count"
                    labelFormatter={(_val, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.displayMonth || "";
                    }}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-chart-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      {/* 1/3 column: Users by Role */}
      <div className="lg:col-span-1">
        <BreakdownBars
          title="Users by Role"
          description="Platform user account distribution"
          items={roleItems}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          emptyTitle="No user records"
          emptyDescription="No users found across system roles."
        />
      </div>
    </div>
  );
});
