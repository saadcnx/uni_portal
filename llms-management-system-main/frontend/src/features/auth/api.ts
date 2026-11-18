import { apiClient } from "@/lib/api-client";
import type { AuthUser } from "@/types/user";
import type { LoginInput } from "./schemas";

export interface AuthResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  message: string;
}

/**
 * Sends login credentials to authenticate the user and receive session cookies.
 */
export async function login(credentials: LoginInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/auth/login", credentials);
}

/**
 * Logs out the current session and clears cookies.
 */
export async function logout(): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse>("/auth/logout");
}

/**
 * Retrieves the currently authenticated user's session profile.
 */
export async function me(): Promise<AuthResponse> {
  return apiClient.get<AuthResponse>("/auth/me");
}
