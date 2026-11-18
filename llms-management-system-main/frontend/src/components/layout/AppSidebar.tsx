"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getNavigationForRole } from "@/constants/navigation";
import { ROLES } from "@/constants/roles";
import { useAuthStore } from "@/stores/auth.store";
import { NavUser } from "./NavUser";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * 1. Subscribes narrowly to role and tenantName slices from the Zustand auth store.
 * 2. Filters navigation items with useMemo based strictly on role changes.
 * 3. Highlights active route and renders a 2px brand indicator based on current pathname.
 * 4. Integrates shadcn Sidebar collapsible="icon" (256px expanded, 56px collapsed) and Sheet drawer on mobile.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const tenantName = useAuthStore((s) => s.user?.tenantName);

  const navItems = useMemo(() => getNavigationForRole(role), [role]);

  // Warm up and prefetch all navigation routes in the background upon mounting
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [navItems, router]);

  const labName =
    tenantName ||
    (role === ROLES.SUPER_ADMIN ? "System Administration" : "Laboratory Portal");

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
      {...props}
    >
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <FlaskConical className="size-4" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              {labName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Laboratory System
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} prefetch={true} />}
                    isActive={active}
                    tooltip={item.title}
                    onMouseEnter={() => router.prefetch(item.href)}
                    className={cn(
                      "relative transition-colors cursor-pointer",
                      active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-brand"
                      />
                    )}
                    <Icon className="size-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
