import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * StatCard is wrapped in React.memo so dashboard updates (such as table pagination,
 * search debounce, or periodic background polling) do not re-render static or unchanged
 * metrics cards.
 */

export interface StatCardProps {
  /** Metric label (12px, font-medium, muted-foreground) */
  label: string;
  /** Primary metric value rendered with tabular-nums (28px semibold) */
  value: string | number;
  /** Lucide icon rendered inside a muted rounded square at the top right */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Optional contextual hint, subtitle, or delta percentage */
  hint?: React.ReactNode;
  /** Optional container CSS class */
  className?: string;
}

export const StatCard = React.memo(function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-none transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="text-[28px] font-semibold tracking-tight text-foreground tabular-nums leading-none pt-1">
            {value}
          </div>
        </div>
        {Icon && (
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <Icon className="size-4.5" />
          </div>
        )}
      </div>

      {hint && (
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
          {hint}
        </div>
      )}
    </Card>
  );
});
