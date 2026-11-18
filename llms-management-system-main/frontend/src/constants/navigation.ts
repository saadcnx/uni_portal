import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Role, ROLES } from "./roles";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: readonly Role[];
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [ROLES.SUPER_ADMIN, ROLES.LAB_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
  },
  {
    title: "Labs",
    href: "/labs",
    icon: Building2,
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    title: "Staff",
    href: "/staff",
    icon: UserCheck,
    roles: [ROLES.LAB_ADMIN],
  },
  {
    title: "Patients",
    href: "/patients",
    icon: UserRound,
    roles: [ROLES.LAB_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
  },
];

export function getNavigationForRole(role: Role | undefined | null): NavItem[] {
  if (!role) return [];
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(role));
}
