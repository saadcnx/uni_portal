import { create } from "zustand";
import type { AuthUser, Role } from "@/types/user";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

/**
 * Re-render reasoning:
 * 1. The store is deliberately NOT persisted to localStorage so auth credentials and roles
 *    never go out of sync with httpOnly session cookies or multi-tab logouts.
 * 2. Exporting narrow primitive selectors (useUserRole, useAuthStatus, useCurrentUser)
 *    ensures components only subscribe to the specific slice of state they depend on,
 *    preventing unnecessary re-renders when unrelated properties update.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),
  setStatus: (status) => set({ status }),
  clear: () =>
    set({
      user: null,
      status: "unauthenticated",
    }),
}));

// Narrow selector hooks to prevent cascading component re-renders
export const useUserRole = (): Role | undefined =>
  useAuthStore((state) => state.user?.role);

export const useCurrentUser = (): AuthUser | null =>
  useAuthStore((state) => state.user);

export const useAuthStatus = (): AuthStatus =>
  useAuthStore((state) => state.status);
