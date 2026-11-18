import * as React from "react";
import { FolderOpen, Search, type LucideIcon } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  variant?: "no-data" | "no-results";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  variant = "no-data",
  className,
}: EmptyStateProps) {
  const IconComponent =
    icon ?? (variant === "no-results" ? Search : FolderOpen);
  const isSmall = size === "sm";

  return (
    <Empty
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isSmall ? "p-4 gap-2 min-h-[160px]" : "p-8 gap-4 min-h-[260px]",
        className
      )}
    >
      <EmptyHeader className={cn(isSmall ? "gap-1.5" : "gap-2")}>
        <EmptyMedia
          variant="icon"
          className={cn(
            "rounded-lg bg-muted text-muted-foreground flex items-center justify-center",
            isSmall
              ? "size-7 [&_svg]:size-3.5 mb-1"
              : "size-10 [&_svg]:size-5 mb-2"
          )}
        >
          <IconComponent aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle
          className={cn(
            isSmall ? "text-xs font-semibold" : "text-sm font-semibold"
          )}
        >
          {title}
        </EmptyTitle>
        {description && (
          <EmptyDescription
            className={cn(
              "text-muted-foreground",
              isSmall ? "text-xs leading-normal" : "text-sm leading-relaxed"
            )}
          >
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && (
        <EmptyContent className={cn(isSmall ? "mt-1" : "mt-2")}>
          {action}
        </EmptyContent>
      )}
    </Empty>
  );
}
