import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError } from "@/types/api";
import { getDashboardStats, type GetDashboardStatsParams } from "./api";
import type { DashboardStats } from "./types";

/**
 * Re-render reasoning:
 * 1. StaleTime of 60 seconds adheres to PERFORMANCE.md Section 4 for dashboard stats queries.
 * 2. Deduplicates concurrent queries and aligns with queryKeys.dashboard.stats(params).
 */
export function useDashboardStats<T = DashboardStats>(
  params?: GetDashboardStatsParams,
  options?: Omit<
    UseQueryOptions<DashboardStats, ApiError, T>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(params),
    queryFn: () => getDashboardStats(params),
    staleTime: 60 * 1000,
    ...options,
  });
}
