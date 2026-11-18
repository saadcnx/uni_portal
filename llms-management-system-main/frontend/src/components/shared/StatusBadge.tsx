import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status?: boolean | "ACTIVE" | "INACTIVE" | "active" | "inactive" | null;
  className?: string;
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const isActive =
    typeof status === "boolean"
      ? status
      : typeof status === "string"
        ? status.toUpperCase() === "ACTIVE"
        : Boolean(status);

  const displayLabel = label ?? (isActive ? "Active" : "Inactive");

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label={`Status: ${displayLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full",
        isActive
          ? "bg-success/15 text-success border-success/30"
          : "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full shrink-0",
          isActive ? "bg-success" : "bg-muted-foreground"
        )}
      />
      <span>{displayLabel}</span>
    </Badge>
  );
}
