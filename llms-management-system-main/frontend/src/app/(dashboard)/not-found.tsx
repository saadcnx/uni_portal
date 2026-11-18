import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

/**
 * Not-found boundary for dashboard routes matching DESIGN.md Section 7.
 */
export default function DashboardNotFound() {
  return (
    <div className="py-12">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The dashboard resource or section you are looking for does not exist."
        variant="no-data"
        action={
          <Button render={<Link href="/dashboard" />} variant="outline">
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
}
