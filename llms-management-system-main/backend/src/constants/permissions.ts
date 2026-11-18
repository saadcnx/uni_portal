import { Role, ROLES } from "./roles.js";

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

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly Role[];
  return allowedRoles.includes(role);
}
