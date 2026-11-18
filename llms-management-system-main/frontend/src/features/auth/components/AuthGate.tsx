"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useMe } from "../hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * Layout-sized skeleton matching the dashboard composition:
 * - Sidebar on the left (256px / w-64)
 * - Header at the top (56px / h-14)
 * - Content area with page header, stat cards grid, and table block
 * Adheres to DESIGN.md section 7: no full-page spinner, layout-matching skeletons.
 */
function AuthGateSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Skeleton */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar p-4 space-y-6">
        {/* Logo and Lab name */}
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 space-y-2 px-1">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>

        {/* User profile footer */}
        <div className="flex items-center gap-3 border-t border-sidebar-border pt-4 px-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Skeleton */}
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-7 rounded-md md:hidden" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Page Content Skeleton */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>

          {/* Content block / Table */}
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    </div>
  );
}

/**
 * Re-render reasoning:
 * 1. Subscribes narrowly to user and setUser in the auth store.
 * 2. Synchronizes GET /auth/me state into Zustand once data resolves.
 * 3. Shows the layout-sized skeleton during initial load without flashing.
 * 4. Redirects to /login if query fails with an unauthenticated status.
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data, isLoading, isError } = useMe();

  useEffect(() => {
    if (data?.user) {
      setUser(data.user);
    }
  }, [data, setUser]);

  useEffect(() => {
    if (isError || (!isLoading && !data?.user && !user)) {
      setUser(null);
      // Explicitly clear the session hint cookie so proxy middleware doesn't bounce /login back to /dashboard
      if (typeof document !== "undefined") {
        document.cookie =
          "lms_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }
      router.replace("/login?expired=1");
    }
  }, [isError, isLoading, data, user, setUser, router]);

  // If loading and no user yet in store
  if (isLoading && !user) {
    return <AuthGateSkeleton />;
  }

  // If error occurred or unauthenticated, render skeleton while redirecting
  if (isError || (!user && !isLoading)) {
    return <AuthGateSkeleton />;
  }

  return <>{children}</>;
}
