import { toast } from "sonner";
import { ApiError, ApiFieldError } from "@/types/api";

export { ApiError };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/v1";

export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  if (endpoint.startsWith(API_BASE)) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
}

function isAuthRoute(url: string): boolean {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout")
  );
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const refreshUrl = resolveUrl("/auth/refresh");
    const response = await fetch(refreshUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return true;
    }
    handleSessionExpired();
    return false;
  } catch {
    handleSessionExpired();
    return false;
  } finally {
    refreshPromise = null;
  }
}

function handleSessionExpired(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("auth-storage");
      // Explicitly clear the session hint cookie so proxy middleware doesn't bounce /login back to /dashboard
      document.cookie =
        "lms_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch {
      // Ignore storage access errors
    }
    toast.error("Session expired. Please log in again.");
    if (window.location.pathname !== "/login") {
      // Hard redirect to login to reset all application state on session expiry
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login?expired=1";
    }
  }
}

interface RequestOptions extends RequestInit {
  _retry?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = resolveUrl(endpoint);
  const { _retry = false, headers, ...restOptions } = options;

  const mergedHeaders: HeadersInit = {
    ...(!(restOptions.body instanceof FormData) && {
      "Content-Type": "application/json",
    }),
    ...headers,
  };

  const response = await fetch(url, {
    ...restOptions,
    credentials: "include",
    headers: mergedHeaders,
  });

  // Handle 401 and attempt single-flight refresh
  if (response.status === 401 && !_retry && !isAuthRoute(url)) {
    if (!refreshPromise) {
      refreshPromise = performRefresh();
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry original request once
      return request<T>(endpoint, {
        ...options,
        _retry: true,
      });
    }
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof data === "object" && data !== null && "message" in data
        ? (data as { message: string }).message
        : response.statusText) || "Request failed";

    const errors =
      typeof data === "object" && data !== null && "errors" in data
        ? (data as { errors?: ApiFieldError[] }).errors
        : undefined;

    const requestId =
      typeof data === "object" && data !== null && "requestId" in data
        ? (data as { requestId?: string }).requestId
        : undefined;

    throw new ApiError(message, response.status, errors, requestId);
  }

  // Unwrap envelope
  if (data && typeof data === "object") {
    if ("data" in data) {
      if ("meta" in data) {
        return { data: data.data, meta: data.meta } as unknown as T;
      }
      return data.data as T;
    }
  }

  return data as T;
}

export async function get<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return request<T>(endpoint, { ...options, method: "GET" });
}

export async function post<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "POST",
    body: data !== undefined ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
  });
}

export async function patch<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: data !== undefined ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
  });
}

export async function del<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return request<T>(endpoint, { ...options, method: "DELETE" });
}

export const apiClient = {
  get,
  post,
  patch,
  del,
  buildQuery,
};
