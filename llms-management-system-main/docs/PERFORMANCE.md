# Performance Specification

## 1. Budgets

| Area | Target |
|---|---|
| API list endpoints | p95 under 200 ms with 100,000 patients in one tenant |
| Dashboard stats endpoint | p95 under 300 ms |
| Frontend LCP | Under 2.5 s |
| Layout shift (CLS) | Under 0.1 |
| Interaction (INP) | Under 200 ms |
| First-load JS per route | Under 200 KB gzipped (charts excluded, they load lazily) |

## 2. Database
- Every tenant query is covered by an index that starts with tenantId. Check with explain("executionStats") that no list query does a collection scan.
- Use lean() and select() on all read paths. Never return passwordHash or token hashes.
- Run find and count in parallel (Promise.all). Cap limit at 100.
- Dashboard: use aggregation pipelines with $match on tenantId first and run the independent aggregations in parallel. Fill empty days in code, not in the database.
- Search with anchored prefix regex on indexed fields only.
- Set maxPoolSize (for example 20) and serverSelectionTimeoutMS. Disable autoIndex in production and create indexes in a controlled step.
- Soft-deleted records are excluded by an index-friendly filter (isActive true).

## 3. API Server
- Use compression, keep JSON small (only needed fields), use async bcrypt only on login and user creation.
- Never block the event loop with heavy synchronous work.
- Log at info level in production; no per-row logging in loops.
- Keep the API stateless so any instance can answer. Provide /health for load balancers. Handle SIGTERM with graceful shutdown (stop accepting requests, close the server, close MongoDB).
- Optional ETag and Cache-Control: private, max-age=30 on the dashboard endpoint.

## 4. Frontend Data
- TanStack Query defaults: staleTime 30 seconds for lists, 60 seconds for dashboard stats, gcTime 5 minutes, retry once, refetchOnWindowFocus off for tables.
- keepPreviousData on all paginated hooks. Prefetch the next page when the current page has more.
- Mutations invalidate only affected query keys. Use optimistic updates only for simple toggles (activate or deactivate).
- Search is debounced 300 ms and keyed by URL params.

## 5. Rendering
- Server Components for shell and layout; client components only at the leaves.
- Zustand selectors are narrow; no object-returning selectors without shallow comparison.
- Stable column definitions and callbacks; React.memo only for measured hot spots (table rows, chart cards).
- Heavy libraries (Recharts through shadcn Chart) and dialogs use next/dynamic with skeleton fallbacks.
- Avoid layout shift: skeletons match the final size; charts have fixed heights.
- Verify with React DevTools Profiler: typing in search must not re-render the sidebar, header or stat cards; changing a page must re-render only the table body.
- If the installed Next.js version offers the React Compiler as stable, it may be enabled, but correct state placement is still required.

## 6. Assets and Fonts
- next/font for Inter and a monospace font, with display swap and subsets. No external CSS or font links.
- Icons from lucide-react imported by name (tree-shaken). No image carousels or large images.
- Run the bundle analyzer once at the end and fix anything unexpected.

## 7. Verification Checklist
1. No list query without an index (explain).
2. Seed 100,000 patients for one tenant and measure list and search latency.
3. Profiler check from section 5.
4. Lighthouse on /dashboard and /patients against the budgets.
5. Kill the API process with SIGTERM and confirm a graceful shutdown.
6. Network tab: typing in search sends one request after the debounce, not one per key.
