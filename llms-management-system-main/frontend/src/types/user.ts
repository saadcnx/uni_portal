export type Role = "SUPER_ADMIN" | "LAB_ADMIN" | "DOCTOR" | "RECEPTIONIST";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName?: string | null;
  isActive: boolean;
}
