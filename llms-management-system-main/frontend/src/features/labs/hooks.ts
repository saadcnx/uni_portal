import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { ApiError, Paginated } from "@/types/api";
import {
  createLab,
  getLab,
  getLabs,
  updateLab,
} from "./api";
import type {
  CreateLabInput,
  Lab,
  ListLabsParams,
  UpdateLabInput,
} from "./types";

/**
 * Re-render reasoning:
 * 1. Uses `placeholderData: keepPreviousData` so page transitions and filter changes
 *    never flash empty layout states while new data is fetching.
 * 2. Scoped queryKey `queryKeys.labs.list(params)` prevents cross-feature cache collisions.
 */
export function useLabs<T = Paginated<Lab>>(
  params?: ListLabsParams,
  options?: Omit<
    UseQueryOptions<Paginated<Lab>, ApiError, T>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.labs.list(params),
    queryFn: () => getLabs(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Fetches a single lab tenant's details by ID.
 */
export function useLab<T = Lab>(
  id: string,
  options?: Omit<
    UseQueryOptions<Lab, ApiError, T>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.labs.detail(id),
    queryFn: () => getLab(id),
    enabled: Boolean(id),
    ...options,
  });
}

/**
 * Mutation hook for creating a lab tenant and primary admin.
 * Invalidates only the labs query key tree on success.
 */
export function useCreateLab(
  options?: UseMutationOptions<
    { tenant: Lab; admin: unknown },
    ApiError,
    CreateLabInput
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLab,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labs.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export interface UpdateLabVariables {
  id: string;
  data: UpdateLabInput;
}

/**
 * Mutation hook for updating an existing lab tenant.
 * Invalidates only the labs query key tree on success.
 */
export function useUpdateLab(
  options?: UseMutationOptions<Lab, ApiError, UpdateLabVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateLabVariables) => updateLab(id, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labs.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
