import type { Role } from "@/constants/roles";

export type UserScope = "all" | "lab";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  tenantId: string | null;
  tenantName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  tenantId?: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role | string;
  isActive?: boolean | string;
  sort?: string;
  tenantId?: string;
}
