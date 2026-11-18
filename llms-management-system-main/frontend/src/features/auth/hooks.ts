import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";
import type { ApiError } from "@/types/api";
import {
  login,
  logout,
  me,
  type AuthResponse,
  type LogoutResponse,
} from "./api";
import type { LoginInput } from "./schemas";

/**
 * Mutation hook for logging in.
 * Sets silent: true on meta to handle field/form errors inline without triggering
 * the generic global mutation error toast.
 * Updates query cache with the returned user on success.
 */
export function useLogin(
  options?: UseMutationOptions<AuthResponse, ApiError, LoginInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: login,
    meta: { silent: true, ...options?.meta },
    onSuccess: (...args) => {
      queryClient.setQueryData(queryKeys.auth.me(), args[0]);
      options?.onSuccess?.(...args);
    },
  });
}

/**
 * Mutation hook for logging out.
 * Clears Zustand auth store, purges entire TanStack Query cache, and redirects to /login.
 */
export function useLogout(
  options?: UseMutationOptions<LogoutResponse, ApiError, void>
) {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clear);
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    queryClient.clear();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return useMutation({
    ...options,
    mutationFn: logout,
    onSuccess: (...args) => {
      handleLogout();
      options?.onSuccess?.(...args);
    },
    onError: (...args) => {
      handleLogout();
      options?.onError?.(...args);
    },
  });
}

/**
 * Query hook for getting current authenticated user.
 */
export function useMe(
  options?: Omit<
    UseQueryOptions<AuthResponse, ApiError, AuthResponse>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: me,
    staleTime: 5 * 60 * 1000,
    retry: false,
    ...options,
  });
}
