export type Palette = "navy" | "cream";

export const PALETTE_STORAGE_KEY = "lms-palette";

export function getPalette(): Palette {
  if (typeof window === "undefined") {
    return "navy";
  }
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved === "cream" || saved === "navy") {
      return saved;
    }
  } catch {
    // Ignore localStorage access errors
  }
  return "navy";
}

export function setPalette(palette: Palette): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
    document.documentElement.setAttribute("data-palette", palette);
    window.dispatchEvent(new CustomEvent("palette-change", { detail: palette }));
  } catch {
    // Ignore localStorage access errors
  }
}

export function subscribeToPalette(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("palette-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("palette-change", callback);
    window.removeEventListener("storage", callback);
  };
}
