export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  LAB_ADMIN: "LAB_ADMIN",
  DOCTOR: "DOCTOR",
  RECEPTIONIST: "RECEPTIONIST",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" &&
    Object.values(ROLES).includes(value as Role)
  );
}
