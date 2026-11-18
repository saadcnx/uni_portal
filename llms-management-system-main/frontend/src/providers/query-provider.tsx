"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "@/lib/query-client";

/**
 * Re-render reasoning:
 * Creating the QueryClient inside a useState initializer `useState(() => createQueryClient())`
 * guarantees a single, stable QueryClient instance across client-side component lifecycles.
 * It prevents the cache from being reset or recreated when parent layouts or wrappers re-render,
 * eliminating unintended query refetches and UI flicker.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
