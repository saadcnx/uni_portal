"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Palette as PaletteIcon,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/features/auth/hooks";
import { getPalette, setPalette, type Palette } from "@/lib/palette";

function subscribeToPalette(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("palette-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("palette-change", callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Re-render reasoning:
 * 1. Subscribes narrowly to the user slice of Zustand auth store.
 * 2. Uses useSyncExternalStore for hydration-safe external palette state synchronization.
 * 3. Handles logout cleanly via useLogout mutation (clearing store, cache, and redirecting).
 */
export function NavUser() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  const currentPalette = useSyncExternalStore(
    subscribeToPalette,
    getPalette,
    () => "navy" as Palette
  );

  const handlePaletteChange = (palette: Palette) => {
    setPalette(palette);
  };

  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer group-data-[collapsible=icon]:p-1.5"
            aria-label="User account menu"
          >
            <UserAvatar name={user.name} size="md" />
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium text-sidebar-foreground">
                {user.name}
              </span>
              <div className="mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56 min-w-56 rounded-lg bg-popover text-popover-foreground shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex items-center gap-2">
                  <UserAvatar name={user.name} size="md" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <RoleBadge role={user.role} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Quick theme toggle */}
            <DropdownMenuItem
              className="cursor-pointer flex items-center justify-between"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <div className="flex items-center gap-2">
                <Sun className="size-4 dark:hidden" />
                <Moon className="size-4 hidden dark:block" />
                <span>Theme</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize font-medium">
                {theme ?? "system"}
              </span>
            </DropdownMenuItem>

            {/* Palette toggle */}
            <DropdownMenuItem
              className="cursor-pointer flex items-center justify-between"
              onClick={() =>
                handlePaletteChange(currentPalette === "navy" ? "cream" : "navy")
              }
            >
              <div className="flex items-center gap-2">
                <PaletteIcon className="size-4" />
                <span>Palette</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize font-medium">
                {currentPalette}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Logout action */}
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={() => setShowLogoutConfirm(true)}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Spinner className="mr-2 size-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 size-4" />
              )}
              <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Shadcn Alert Dialog confirmation for logout */}
        <ConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          title="Log out"
          description="Are you sure you want to log out of your account?"
          confirmLabel={logoutMutation.isPending ? "Logging out..." : "Log out"}
          cancelLabel="Cancel"
          destructive
          isPending={logoutMutation.isPending}
          onConfirm={async () => {
            await logoutMutation.mutateAsync();
          }}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
