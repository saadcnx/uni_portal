import { Role } from "../constants/roles.js";

export interface AuthUser {
  id: string;
  role: Role;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

export interface RequestValidation {
  body: unknown;
  query: unknown;
  params: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: RequestValidation;
      id?: string;
    }
  }
}
