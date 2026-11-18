import { Suspense } from "react";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuthGate } from "@/features/auth/components/AuthGate";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";

/**
 * Re-render reasoning:
 * 1. DashboardLayout is a Server Component shell: layout markup is static and does not re-render on route transitions.
 * 2. Reads the sidebar_state cookie on the server to prevent hydration flash of expanded/collapsed states.
 * 3. Enforces session validity and renders layout skeletons while unauthenticated via AuthGate.
 * 4. Children render in a centered, max-w-[1280px] main area with 24px (16px on mobile) padding per DESIGN.md.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AuthGate>
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="h-svh max-h-svh w-full overflow-hidden"
      >
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
          <AppHeader />
          <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden bg-background">
            <main className="mx-auto w-full max-w-[1280px] p-4 sm:p-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
