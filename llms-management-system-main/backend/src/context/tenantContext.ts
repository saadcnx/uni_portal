import { AsyncLocalStorage } from "node:async_hooks";
import { Role } from "../constants/roles.js";

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  role: Role;
  isSuperAdmin: boolean;
}

const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(context: TenantContext, callback: () => T): T {
  return asyncLocalStorage.run(context, callback);
}

export function getTenantContext(): TenantContext | undefined {
  return asyncLocalStorage.getStore();
}
