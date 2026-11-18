"use client";

import { useState, useSyncExternalStore } from "react";
import { LogOut, Palette as PaletteIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ThemeToggle } from "./ThemeToggle";
import { PaletteSwitcher } from "./PaletteSwitcher";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/features/auth/hooks";
import { getPalette, setPalette, type Palette } from "@/lib/palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
 * 1. AppHeader is a client boundary subscribing narrowly to current user info.
 * 2. Sticky 56px layout matching DESIGN.md Section 5 (SidebarTrigger, Breadcrumbs, spacer, ThemeToggle, direct Logout, avatar dropdown).
 * 3. Logout action invokes useLogout mutation.
 */
export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentPalette = useSyncExternalStore(
    subscribeToPalette,
    getPalette,
    () => "navy" as Palette
  );

  const handlePaletteChange = (palette: Palette) => {
    setPalette(palette);
  };

  return (
    <header className="shrink-0 flex h-14 w-full items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <SidebarTrigger className="cursor-pointer" aria-label="Toggle sidebar" />
      <Breadcrumbs />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <PaletteSwitcher />
        <ThemeToggle />

        {/* Prominent direct log out button in the header */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          onClick={() => setShowLogoutConfirm(true)}
          disabled={logoutMutation.isPending}
          title="Log out"
          aria-label="Log out"
        >
          {logoutMutation.isPending ? (
            <Spinner className="size-4 animate-spin text-destructive" />
          ) : (
            <LogOut className="size-4" />
          )}
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center rounded-full outline-hidden ring-sidebar-ring focus-visible:ring-2 cursor-pointer"
              aria-label="User account menu"
            >
              <UserAvatar name={user.name} size="md" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-lg bg-popover text-popover-foreground shadow-lg"
              sideOffset={6}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="mt-2">
                    <RoleBadge role={user.role} />
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Palette selection toggle */}
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
        )}
      </div>

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
    </header>
  );
}
