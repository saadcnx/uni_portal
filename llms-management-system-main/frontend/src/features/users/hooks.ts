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
  createUser,
  getUser,
  getUsers,
  updateUser,
} from "./api";
import type {
  CreateUserInput,
  ListUsersParams,
  UpdateUserInput,
  User,
} from "./types";

/**
 * Re-render reasoning:
 * 1. Uses `placeholderData: keepPreviousData` so page transitions and filter changes
 *    never flash empty layout states while new data is fetching.
 * 2. Scoped queryKey `queryKeys.users.list(params)` prevents cross-feature cache collisions.
 */
export function useUsers<T = Paginated<User>>(
  params?: ListUsersParams,
  options?: Omit<
    UseQueryOptions<Paginated<User>, ApiError, T>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Fetches a single user's details by ID.
 */
export function useUser<T = User>(
  id: string,
  options?: Omit<
    UseQueryOptions<User, ApiError, T>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: Boolean(id),
    ...options,
  });
}

/**
 * Mutation hook for creating a user account.
 * Invalidates only the users query key tree on success.
 */
export function useCreateUser(
  options?: UseMutationOptions<User, ApiError, CreateUserInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export interface UpdateUserVariables {
  id: string;
  data: UpdateUserInput;
}

/**
 * Mutation hook for updating an existing user account.
 * Invalidates only the users query key tree on success.
 */
export function useUpdateUser(
  options?: UseMutationOptions<User, ApiError, UpdateUserVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateUserVariables) => updateUser(id, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
