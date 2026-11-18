"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground p-8 font-sans">
        <div className="max-w-2xl mx-auto space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <h2 className="text-xl font-bold text-destructive">Application Error</h2>
          <p className="text-sm font-semibold">{error.message || "An unexpected error occurred."}</p>
          {error.stack && (
            <pre className="text-xs bg-black/80 text-white p-4 rounded overflow-auto max-h-96">
              {error.stack}
            </pre>
          )}
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
