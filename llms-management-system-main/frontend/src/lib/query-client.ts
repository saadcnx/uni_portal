import { QueryClient, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/types/api";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      silent?: boolean;
      [key: string]: unknown;
    };
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds for lists
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 1, // retry once
        refetchOnWindowFocus: false, // off for tables
      },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Skip when meta.silent is true
        if (mutation.meta?.silent) {
          return;
        }

        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "An unexpected error occurred";

        toast.error(message);
      },
    }),
  });
}

let clientQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  if (!clientQueryClient) {
    clientQueryClient = createQueryClient();
  }
  return clientQueryClient;
}

export const queryClient = getQueryClient();
