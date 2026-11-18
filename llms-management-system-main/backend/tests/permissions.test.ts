import { describe, expect, it } from "vitest";
import { hasPermission } from "../src/constants/permissions.js";
import { isRole, ROLES } from "../src/constants/roles.js";
import { getTenantContext, runWithTenant } from "../src/context/tenantContext.js";
import { ApiError } from "../src/utils/ApiError.js";

describe("Roles and isRole helper", () => {
  it("recognizes all valid roles", () => {
    expect(isRole("SUPER_ADMIN")).toBe(true);
    expect(isRole("LAB_ADMIN")).toBe(true);
    expect(isRole("DOCTOR")).toBe(true);
    expect(isRole("RECEPTIONIST")).toBe(true);
  });

  it("rejects invalid role strings and non-string values", () => {
    expect(isRole("NURSE")).toBe(false);
    expect(isRole("ADMIN")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(123)).toBe(false);
  });
});

describe("Permissions Matrix (FEATURES.md Section 2)", () => {
  describe("Super Admin permissions", () => {
    it("can manage tenants, users, read dashboard, but not patient operations", () => {
      expect(hasPermission(ROLES.SUPER_ADMIN, "tenant:manage")).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, "user:manage")).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, "dashboard:read")).toBe(true);

      expect(hasPermission(ROLES.SUPER_ADMIN, "patient:create")).toBe(false);
      expect(hasPermission(ROLES.SUPER_ADMIN, "patient:read")).toBe(false);
      expect(hasPermission(ROLES.SUPER_ADMIN, "patient:update")).toBe(false);
      expect(hasPermission(ROLES.SUPER_ADMIN, "patient:delete")).toBe(false);
    });
  });

  describe("Lab Admin permissions", () => {
    it("can manage users, all patient operations, read dashboard, but not tenants", () => {
      expect(hasPermission(ROLES.LAB_ADMIN, "tenant:manage")).toBe(false);

      expect(hasPermission(ROLES.LAB_ADMIN, "user:manage")).toBe(true);
      expect(hasPermission(ROLES.LAB_ADMIN, "patient:create")).toBe(true);
      expect(hasPermission(ROLES.LAB_ADMIN, "patient:read")).toBe(true);
      expect(hasPermission(ROLES.LAB_ADMIN, "patient:update")).toBe(true);
      expect(hasPermission(ROLES.LAB_ADMIN, "patient:delete")).toBe(true);
      expect(hasPermission(ROLES.LAB_ADMIN, "dashboard:read")).toBe(true);
    });
  });

  describe("Doctor permissions", () => {
    it("is read-only: can only view patients and read dashboard", () => {
      expect(hasPermission(ROLES.DOCTOR, "tenant:manage")).toBe(false);
      expect(hasPermission(ROLES.DOCTOR, "user:manage")).toBe(false);
      expect(hasPermission(ROLES.DOCTOR, "patient:create")).toBe(false);
      expect(hasPermission(ROLES.DOCTOR, "patient:read")).toBe(true);
      expect(hasPermission(ROLES.DOCTOR, "patient:update")).toBe(false);
      expect(hasPermission(ROLES.DOCTOR, "patient:delete")).toBe(false);
      expect(hasPermission(ROLES.DOCTOR, "dashboard:read")).toBe(true);
    });
  });

  describe("Receptionist permissions", () => {
    it("can register, view and edit patients, read dashboard, but cannot delete or manage users/tenants", () => {
      expect(hasPermission(ROLES.RECEPTIONIST, "tenant:manage")).toBe(false);
      expect(hasPermission(ROLES.RECEPTIONIST, "user:manage")).toBe(false);
      expect(hasPermission(ROLES.RECEPTIONIST, "patient:create")).toBe(true);
      expect(hasPermission(ROLES.RECEPTIONIST, "patient:read")).toBe(true);
      expect(hasPermission(ROLES.RECEPTIONIST, "patient:update")).toBe(true);
      expect(hasPermission(ROLES.RECEPTIONIST, "patient:delete")).toBe(false);
      expect(hasPermission(ROLES.RECEPTIONIST, "dashboard:read")).toBe(true);
    });
  });
});

describe("TenantContext AsyncLocalStorage", () => {
  it("provides undefined when running outside tenant context", () => {
    expect(getTenantContext()).toBeUndefined();
  });

  it("propagates tenant context within runWithTenant", () => {
    const ctx = {
      tenantId: "tenant_123",
      userId: "user_456",
      role: ROLES.LAB_ADMIN,
      isSuperAdmin: false,
    };

    const result = runWithTenant(ctx, () => {
      const current = getTenantContext();
      expect(current).toEqual(ctx);
      return current?.tenantId;
    });

    expect(result).toBe("tenant_123");
    expect(getTenantContext()).toBeUndefined();
  });
});

describe("ApiError class and helpers", () => {
  it("creates ApiError instances with proper status codes and messages", () => {
    const badReq = ApiError.badRequest("Invalid input");
    expect(badReq.statusCode).toBe(400);
    expect(badReq.message).toBe("Invalid input");

    const unauthorized = ApiError.unauthorized();
    expect(unauthorized.statusCode).toBe(401);

    const forbidden = ApiError.forbidden();
    expect(forbidden.statusCode).toBe(403);

    const notFound = ApiError.notFound();
    expect(notFound.statusCode).toBe(404);

    const conflict = ApiError.conflict();
    expect(conflict.statusCode).toBe(409);

    const tooMany = ApiError.tooMany();
    expect(tooMany.statusCode).toBe(429);
  });
});
