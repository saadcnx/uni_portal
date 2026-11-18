import { apiClient } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type {
  CreateUserInput,
  ListUsersParams,
  UpdateUserInput,
  User,
} from "./types";

/**
 * Fetches a paginated list of users with search, role, status, and tenant filters.
 */
export async function getUsers(
  params?: ListUsersParams
): Promise<Paginated<User>> {
  const query = apiClient.buildQuery(params as Record<string, unknown>);
  return apiClient.get<Paginated<User>>(`/users${query}`);
}

/**
 * Fetches a single user by ID.
 */
export async function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`/users/${id}`);
}

/**
 * Creates a new user account.
 */
export async function createUser(data: CreateUserInput): Promise<User> {
  return apiClient.post<User>("/users", data);
}

/**
 * Updates an existing user account by ID.
 */
export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<User> {
  return apiClient.patch<User>(`/users/${id}`, data);
}

export const usersApi = {
  getUsers,
  getUser,
  createUser,
  updateUser,
};
