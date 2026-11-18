export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
    list: (params?: unknown) => [...queryKeys.auth.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.auth.all, "detail", id] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: (params?: unknown) => [...queryKeys.dashboard.all, "stats", params] as const,
    list: (params?: unknown) => [...queryKeys.dashboard.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.dashboard.all, "detail", id] as const,
  },
  labs: {
    all: ["labs"] as const,
    lists: () => [...queryKeys.labs.all, "list"] as const,
    list: (params?: unknown) => [...queryKeys.labs.lists(), params] as const,
    details: () => [...queryKeys.labs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.labs.details(), id] as const,
  },
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (params?: unknown) => [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  patients: {
    all: ["patients"] as const,
    lists: () => [...queryKeys.patients.all, "list"] as const,
    list: (params?: unknown) => [...queryKeys.patients.lists(), params] as const,
    details: () => [...queryKeys.patients.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.patients.details(), id] as const,
  },
} as const;
