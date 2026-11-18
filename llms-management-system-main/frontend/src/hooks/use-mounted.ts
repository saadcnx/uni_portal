import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Re-render reasoning:
 * By utilizing React's `useSyncExternalStore` instead of a traditional `useEffect + useState`,
 * this hook provides a flicker-free client hydration check without initiating a cascading
 * second render pass or violating React 19 rules against synchronous setState in effects.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
