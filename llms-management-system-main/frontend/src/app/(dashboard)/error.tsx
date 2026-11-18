"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level error boundary matching DESIGN.md Section 7:
 * Uses shadcn Alert with an alert icon, clear message, and Try again action.
 */
export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="py-6">
      <Alert variant="destructive" className="max-w-2xl border-destructive/30">
        <AlertCircle className="size-4" />
        <AlertTitle className="font-semibold">Something went wrong</AlertTitle>
        <AlertDescription className="mt-2 space-y-4">
          <p className="text-sm text-destructive/90">
            {error.message ||
              "An unexpected error occurred while loading this view."}
          </p>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
