import { useEffect, useState } from "react";

/**
 * Re-render reasoning:
 * Delays propagating rapid input changes (such as search keystrokes) by a specified duration (default 300ms).
 * This prevents downstream consumer components, TanStack Query hooks, and URL search param updaters
 * from triggering expensive network requests and rendering cycles on every single keystroke.
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
