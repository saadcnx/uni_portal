"use client";

import { useMemo, useCallback } from "react";
import {
  useQueryStates,
  parseAsInteger,
  parseAsString,
  type UseQueryStatesKeysMap,
} from "nuqs";
import { type SortingState, type OnChangeFn } from "@tanstack/react-table";

/**
 * Re-render reasoning:
 * `useTableParams` manages table pagination, limit, search, sort, and custom filter
 * state directly in URL query parameters using nuqs with shallow routing.
 * This pattern satisfies:
 * 1. URL-driven table state (survives page refresh and back/forward navigation).
 * 2. Zero duplicate `useState` across page components.
 * 3. Narrow subscriptions: only the table and query hooks subscribed to URL params
 *    re-render when parameters change, preventing parent layouts from re-rendering.
 * 4. Automatic pagination reset: changing search or any filter automatically resets `page` to 1.
 */

export interface UseTableParamsOptions<
  TExtra extends UseQueryStatesKeysMap = UseQueryStatesKeysMap
> {
  /** Default limit per page. Defaults to 20 per API contract. */
  defaultLimit?: number;
  /** Default sort string (e.g. "-createdAt" or "name"). Defaults to "". */
  defaultSort?: string;
  /** Additional nuqs parser definitions for custom filters (e.g., status, role, gender) */
  extraParsers?: TExtra;
}

export function useTableParams<
  TExtra extends UseQueryStatesKeysMap = Record<string, never>
>(options?: UseTableParamsOptions<TExtra>) {
  const defaultLimit = options?.defaultLimit ?? 20;
  const defaultSort = options?.defaultSort ?? "";
  const extraParsers = options?.extraParsers;

  // Memoize combined parsers map for nuqs
  const parsers = useMemo(() => {
    return {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(defaultLimit),
      search: parseAsString.withDefault(""),
      sort: parseAsString.withDefault(defaultSort),
      ...(extraParsers ?? {}),
    } as const;
  }, [defaultLimit, defaultSort, extraParsers]);

  // nuqs with shallow routing enabled so URL updates client-side without full server roundtrips
  const [state, setState] = useQueryStates(parsers, {
    shallow: true,
  });

  // Convert URL sort string to TanStack Table SortingState
  const sorting: SortingState = useMemo(() => {
    if (!state.sort) return [];
    const isDesc = state.sort.startsWith("-") || state.sort.endsWith(".desc");
    const id = state.sort
      .replace(/^-/, "")
      .replace(/\.desc$/, "")
      .replace(/\.asc$/, "");
    return [{ id, desc: isDesc }];
  }, [state.sort]);

  // Change page
  const setPage = useCallback(
    (page: number) => {
      setState({ page: page <= 1 ? null : page });
    },
    [setState]
  );

  // Change limit: automatically resets page to 1
  const setLimit = useCallback(
    (limit: number) => {
      setState({
        limit: limit === defaultLimit ? null : limit,
        page: null,
      });
    },
    [setState, defaultLimit]
  );

  // Change search: automatically resets page to 1
  const setSearch = useCallback(
    (search: string) => {
      const trimmed = search.trim();
      setState({
        search: trimmed ? trimmed : null,
        page: null,
      });
    },
    [setState]
  );

  // Change sort
  const setSort = useCallback(
    (sort: string) => {
      const trimmed = sort.trim();
      setState({
        sort: trimmed ? trimmed : null,
      });
    },
    [setState]
  );

  // TanStack Table onSortingChange adapter
  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      if (!nextSorting || nextSorting.length === 0) {
        setSort("");
      } else {
        const first = nextSorting[0];
        setSort(first.desc ? `-${first.id}` : first.id);
      }
    },
    [sorting, setSort]
  );

  // Change a single custom filter: automatically resets page to 1
  const setFilter = useCallback(
    (key: string, value: unknown) => {
      setState({
        [key]: value ?? null,
        page: null,
      } as Parameters<typeof setState>[0]);
    },
    [setState]
  );

  // Batch update parameters: resets page to 1 if search, limit, or any filter key changed
  const setParams = useCallback(
    (updates: Record<string, unknown>) => {
      const next: Record<string, unknown> = { ...updates };
      const shouldResetPage =
        updates.page === undefined &&
        Object.keys(updates).some((k) => k !== "sort" && k !== "page");

      if (shouldResetPage) {
        next.page = null;
      }

      return setState(next as Parameters<typeof setState>[0]);
    },
    [setState]
  );

  // Reset all filters and search, resetting page to 1
  const resetFilters = useCallback(() => {
    const resetMap: Record<string, null> = {
      search: null,
      page: null,
    };
    if (extraParsers) {
      for (const key of Object.keys(extraParsers)) {
        resetMap[key] = null;
      }
    }
    return setState(resetMap as Parameters<typeof setState>[0]);
  }, [setState, extraParsers]);

  // Extract extra filters map (keys other than page, limit, search, sort)
  const filters = useMemo(() => {
    const extra: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(state)) {
      if (key !== "page" && key !== "limit" && key !== "search" && key !== "sort") {
        extra[key] = val;
      }
    }
    return extra;
  }, [state]);

  return {
    page: state.page,
    limit: state.limit,
    search: state.search,
    sort: state.sort,
    params: state,
    filters,
    sorting,
    onSortingChange,
    setPage,
    setLimit,
    setSearch,
    setSort,
    setFilter,
    setParams,
    resetFilters,
  };
}
