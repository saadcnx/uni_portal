import { apiClient, buildQuery } from "@/lib/api-client";
import type { DashboardStats } from "./types";

export interface GetDashboardStatsParams {
  days?: number;
}

/**
 * Fetches role-specific dashboard metrics, charts, and recent activity from the API.
 */
export async function getDashboardStats(
  params?: GetDashboardStatsParams
): Promise<DashboardStats> {
  const query = buildQuery(params as Record<string, unknown> | undefined);
  return apiClient.get<DashboardStats>(`/dashboard/stats${query}`);
}

export const dashboardApi = {
  getDashboardStats,
};
