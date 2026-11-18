"use client";

import { useSyncExternalStore } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPalette,
  setPalette,
  subscribeToPalette,
  type Palette,
} from "@/lib/palette";

/**
 * Re-render reasoning:
 * PaletteSwitcher uses useSyncExternalStore to synchronize client-side
 * palette state safely with localStorage and custom 'palette-change' events.
 * Provides a direct 1-click toggle between Navy and Cream palettes without
 * popup portals, preventing positioning collisions in sticky headers.
 */
export function PaletteSwitcher() {
  const currentPalette = useSyncExternalStore(
    subscribeToPalette,
    getPalette,
    () => "navy" as Palette
  );

  const togglePalette = () => {
    const next: Palette = currentPalette === "navy" ? "cream" : "navy";
    setPalette(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative size-8 text-muted-foreground hover:text-foreground cursor-pointer"
      onClick={togglePalette}
      title={`Current palette: ${currentPalette === "navy" ? "Navy" : "Cream"}. Click to switch to ${currentPalette === "navy" ? "Cream" : "Navy"}.`}
      aria-label={`Switch color palette (current: ${currentPalette})`}
    >
      <PaletteIcon className="size-4" />
      <span
        className={cn(
          "absolute bottom-1 right-1 size-1.5 rounded-full border border-background transition-colors",
          currentPalette === "navy" ? "bg-[#071739]" : "bg-[#C8412B]"
        )}
        aria-hidden="true"
      />
      <span className="sr-only">Toggle palette</span>
    </Button>
  );
}
