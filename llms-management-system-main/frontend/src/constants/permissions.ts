import { Role, ROLES } from "./roles";

export const PERMISSIONS = {
  "tenant:manage": [ROLES.SUPER_ADMIN],
  "user:manage": [ROLES.SUPER_ADMIN, ROLES.LAB_ADMIN],
  "patient:create": [ROLES.LAB_ADMIN, ROLES.RECEPTIONIST],
  "patient:read": [ROLES.LAB_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
  "patient:update": [ROLES.LAB_ADMIN, ROLES.RECEPTIONIST],
  "patient:delete": [ROLES.LAB_ADMIN],
  "dashboard:read": [
    ROLES.SUPER_ADMIN,
    ROLES.LAB_ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
  ],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission] as readonly Role[];
  return allowedRoles.includes(role);
}

export const hasPermission = can;
