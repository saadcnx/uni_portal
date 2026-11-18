"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { useUserRole } from "@/stores/auth.store";
import { can, type Permission } from "@/constants/permissions";
import { type Role } from "@/types/user";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * Re-render reasoning:
 * RoleGuard subscribes strictly to the user's role via the narrow primitive selector
 * `useUserRole()`. This prevents components wrapped by RoleGuard from re-rendering
 * when other parts of the auth state (such as user avatar, email, or token expiry) update.
 */

export interface RoleGuardProps {
  /** List of roles explicitly allowed to view children */
  allowedRoles?: readonly Role[];
  /** Permission key evaluated against backend permission map */
  permission?: Permission;
  /** Optional custom fallback component when access is denied */
  fallback?: React.ReactNode;
  /** Protected children elements */
  children: React.ReactNode;
}

export function RoleGuard({
  allowedRoles,
  permission,
  fallback,
  children,
}: RoleGuardProps) {
  const role = useUserRole();

  let hasAccess = false;

  if (permission) {
    hasAccess = can(role, permission);
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = Boolean(role && allowedRoles.includes(role));
  } else {
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <EmptyState
      icon={ShieldAlert}
      title="Access Denied"
      description="You do not have permission to view this section or resource."
      variant="no-data"
    />
  );
}
