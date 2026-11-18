import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLES, type Role } from "@/constants/roles";

export interface RoleBadgeProps {
  role: Role;
  className?: string;
}

const ROLE_CONFIG: Record<
  Role,
  { label: string; className: string }
> = {
  [ROLES.SUPER_ADMIN]: {
    label: "Super Admin",
    className: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  },
  [ROLES.LAB_ADMIN]: {
    label: "Lab Admin",
    className: "bg-brand/15 text-brand border-brand/30",
  },
  [ROLES.DOCTOR]: {
    label: "Doctor",
    className: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  },
  [ROLES.RECEPTIONIST]: {
    label: "Receptionist",
    className: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge
      variant="outline"
      aria-label={`Role: ${config.label}`}
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
