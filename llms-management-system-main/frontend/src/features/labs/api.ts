import { apiClient } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type {
  CreateLabInput,
  Lab,
  ListLabsParams,
  UpdateLabInput,
} from "./types";

/**
 * Fetches a paginated list of laboratories/tenants (Super Admin only).
 */
export async function getLabs(
  params?: ListLabsParams
): Promise<Paginated<Lab>> {
  const query = apiClient.buildQuery(params as Record<string, unknown>);
  return apiClient.get<Paginated<Lab>>(`/tenants${query}`);
}

/**
 * Fetches a single lab tenant by ID.
 */
export async function getLab(id: string): Promise<Lab> {
  return apiClient.get<Lab>(`/tenants/${id}`);
}

/**
 * Creates a new laboratory tenant and its initial Lab Admin user.
 */
export async function createLab(
  data: CreateLabInput
): Promise<{ tenant: Lab; admin: unknown }> {
  return apiClient.post<{ tenant: Lab; admin: unknown }>("/tenants", data);
}

/**
 * Updates an existing laboratory tenant by ID.
 */
export async function updateLab(
  id: string,
  data: UpdateLabInput
): Promise<Lab> {
  return apiClient.patch<Lab>(`/tenants/${id}`, data);
}

export const labsApi = {
  getLabs,
  getLab,
  createLab,
  updateLab,
};
