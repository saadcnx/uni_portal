# Frontend Specification

Stack: Next.js (App Router, latest stable), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query and Table, Zustand, nuqs, react-hook-form, zod, next-themes, lucide-react.

## 1. Folder Structure
```
frontend/src/
  app/
    layout.tsx                      root: fonts, ThemeProvider, QueryProvider, Toaster
    globals.css                     design tokens (see DESIGN.md)
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx                    SidebarProvider, AppSidebar, AppHeader, AuthGate
      loading.tsx, error.tsx, not-found.tsx
      dashboard/page.tsx
      labs/page.tsx                 Super Admin
      users/page.tsx                Super Admin
      staff/page.tsx                Lab Admin
      patients/page.tsx             Lab Admin, Doctor, Receptionist
      patients/[id]/page.tsx
  components/
    ui/                             shadcn generated, do not hand-edit logic
    shared/                         DataTable, DataTablePagination, TableSkeleton, EmptyState,
                                    SearchInput, PageHeader, StatCard, StatCardSkeleton, ChartCard,
                                    ConfirmDialog, RoleGuard, UserAvatar, StatusBadge, RoleBadge
    layout/                         AppSidebar, AppHeader, NavUser, Breadcrumbs, ThemeToggle
  features/
    auth/        api.ts, hooks.ts, schemas.ts, components/LoginForm.tsx, components/AuthGate.tsx
    dashboard/   api.ts, hooks.ts, types.ts, components/ (RegistrationsBarChart, BreakdownBars, RecentPatientsTable, SuperAdminCharts)
    labs/        api.ts, hooks.ts, schemas.ts, types.ts, components/ (LabsTable, LabColumns, LabFormDialog)
    users/       api.ts, hooks.ts, schemas.ts, types.ts, components/ (UsersTable, UserColumns, UserFormDialog)
    patients/    api.ts, hooks.ts, schemas.ts, types.ts, components/ (PatientsTable, PatientColumns, PatientFormDialog, PatientDetails)
  hooks/         use-debounced-value.ts, use-mounted.ts
  lib/           api-client.ts, query-client.ts, query-keys.ts, utils.ts, format.ts
  stores/        auth.store.ts, (optional) ui.store.ts
  providers/     query-provider.tsx, theme-provider.tsx
  constants/     roles.ts, permissions.ts, navigation.ts
  types/         api.ts (ApiResponse, Paginated, ApiError), user.ts
  proxy.ts       route guard (named middleware.ts in Next.js 15 and older; use the name the installed version expects)
```

## 2. Data Fetching and API Access
- The browser calls same-origin /api/v1/... and next.config.ts rewrites /api/v1/:path* to BACKEND_URL (http://localhost:5000). No CORS issues and cookies belong to the frontend origin.
- lib/api-client.ts is the only place that calls fetch. It sets credentials: include, unwraps the envelope, throws a typed ApiError, and on 401 (except auth routes) performs one single-flight POST /auth/refresh and retries the request once. If refresh fails it clears the auth store, shows a toast and redirects to /login.
- Each feature has api.ts (plain functions), hooks.ts (TanStack Query hooks) and query keys from lib/query-keys.ts. Components never call fetch or api.ts directly; they use hooks.
- Server Components render only the static shell. All data is fetched on the client through TanStack Query.

## 3. State Placement

| Data | Tool | Reason |
|---|---|---|
| Server data (lists, stats) | TanStack Query | Cache, loading, error, refetch |
| Search, page, sort, filters | URL via nuqs | Shareable, survives refresh, no useState |
| Logged-in user and auth status | Zustand with selectors | Small global state, narrow subscription |
| Form state | react-hook-form + zod | No re-render per keystroke |
| Local UI (dialog open, raw input text) | useState inside the component | Local only |
| Theme | next-themes (Context) | Rarely changes |

Context must never hold frequently changing data. Provider values must be stable.

## 4. Rendering Rules
1. "use client" only on leaf components that need interactivity. Layout shells stay server components.
2. Select narrowly from Zustand: useAuthStore((s) => s.user?.role).
3. Lists use placeholderData: keepPreviousData so pages never flash empty.
4. Mutations invalidate only their own keys (for example queryKeys.patients.all).
5. Search input keeps its own text with useState and writes to the URL after a 300 ms debounce.
6. Table columns are defined outside the component or memoized with useMemo. Row actions use stable callbacks.
7. React.memo and useCallback only where profiling shows a benefit.
8. Charts and dialogs are loaded with next/dynamic and show skeleton fallbacks.
9. No data duplication: a hook is the single source for its data. Two components needing patients use the same hook and query key.
10. No inline object or array props to memoized children.

## 5. Loading, Feedback and Errors
- Page load: loading.tsx with Skeleton. Table first load: TableSkeleton rows. Stat cards: StatCardSkeleton.
- Table page or filter change: keep old rows, reduce opacity to 60 percent and show a small spinner via isFetching. No skeleton.
- Buttons: disabled with a spinner while isPending. Search input: small spinner while fetching.
- Toasts (Sonner): success after create, update, deactivate; error through one global MutationCache onError; session expired; 403 permission denied. Field errors are inline with FormMessage, never toasts.
- error.tsx with a Try again button; not-found.tsx; Alert for inline section errors with a Retry action.
- Destructive actions use AlertDialog confirmation.

## 6. Routing and Guards
- (auth) group is public; (dashboard) group requires a session.
- proxy.ts redirects to /login when the lms_session hint cookie is missing, and redirects logged-in users away from /login. It does not verify JWTs.
- AuthGate (client) calls GET /auth/me, fills the auth store, shows a full-layout skeleton while loading, and redirects to /login on failure.
- RoleGuard checks constants/permissions.ts and renders an Access Denied empty state when a role opens a page it should not. The sidebar is built from constants/navigation.ts filtered by role.
- Role landing: every role lands on /dashboard.

## 7. Forms
Each form has a zod schema in features/*/schemas.ts (the same rules as API_CONTRACT.md validation), react-hook-form with zodResolver, shadcn Form components, inline field errors, server field errors mapped back with setError, and a disabled submit button while pending. Create and edit use the same Dialog form component.

## 8. shadcn Components to Install
button, input, label, form, card, table, badge, skeleton, sonner, dialog, alert-dialog, sheet, select, tabs, tooltip, separator, breadcrumb, dropdown-menu, avatar, sidebar, chart, empty, alert, scroll-area, collapsible, switch, spinner, pagination. If a component name differs in the installed shadcn version, use the closest equivalent and keep the same anatomy.

## 9. Environment
BACKEND_URL=http://localhost:5000 (used only by next.config.ts rewrites). NEXT_PUBLIC_API_BASE=/api/v1.
