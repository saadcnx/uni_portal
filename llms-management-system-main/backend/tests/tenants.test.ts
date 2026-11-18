import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ROLES } from "../src/constants/roles.js";
import { Tenant, TENANT_STATUS } from "../src/modules/tenants/tenant.model.js";
import { User } from "../src/modules/users/user.model.js";
import { COOKIE_NAMES } from "../src/utils/cookies.js";
import { signAccessToken } from "../src/utils/tokens.js";

describe("Tenant Module Integration Tests (Supertest)", () => {
  let mongod: MongoMemoryServer;
  let app: Express;

  let superAdminCookie: string;
  let labAdminCookie: string;
  let existingTenantId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    app = createApp();

    // 1. Create baseline active tenant
    const baseTenant = await Tenant.create({
      name: "Global Diagnostics",
      slug: "global-diagnostics",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "info@globaldiag.test",
      contactPhone: "+1-555-1000",
    });
    existingTenantId = baseTenant._id.toString();

    // 2. Create Super Admin
    const superAdmin = await User.create({
      name: "Root Admin",
      email: "root@platform.test",
      passwordHash: "hash123",
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isActive: true,
    });

    const superAdminToken = signAccessToken({
      id: superAdmin._id.toString(),
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isSuperAdmin: true,
    });
    superAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${superAdminToken}`;

    // 3. Create regular Lab Admin
    const labAdmin = await User.create({
      name: "Local Lab Admin",
      email: "local@globaldiag.test",
      passwordHash: "hash123",
      role: ROLES.LAB_ADMIN,
      tenantId: baseTenant._id,
      isActive: true,
    });

    const labAdminToken = signAccessToken({
      id: labAdmin._id.toString(),
      role: ROLES.LAB_ADMIN,
      tenantId: baseTenant._id.toString(),
      isSuperAdmin: false,
    });
    labAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${labAdminToken}`;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  describe("POST /api/v1/tenants", () => {
    it("creates a new tenant and its initial lab admin with 201 status", async () => {
      const res = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "Apex Medical Labs",
          contactEmail: "contact@apexlabs.test",
          contactPhone: "+1-555-8899",
          admin: {
            name: "Apex Administrator",
            email: "admin@apexlabs.test",
            password: "ApexPassword123!",
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant).toBeDefined();
      expect(res.body.data.tenant.name).toBe("Apex Medical Labs");
      expect(res.body.data.tenant.slug).toBe("apex-medical-labs");
      expect(res.body.data.tenant.status).toBe(TENANT_STATUS.ACTIVE);
      expect(res.body.data.admin).toBeDefined();
      expect(res.body.data.admin.email).toBe("admin@apexlabs.test");
      expect(res.body.data.admin.role).toBe(ROLES.LAB_ADMIN);
      expect(res.body.data.admin.passwordHash).toBeUndefined();

      // Verify records in database
      const tenantInDb = await Tenant.findById(res.body.data.tenant.id);
      expect(tenantInDb).not.toBeNull();
      const adminInDb = await User.findOne({ email: "admin@apexlabs.test" });
      expect(adminInDb).not.toBeNull();
      expect(adminInDb?.tenantId?.toString()).toBe(res.body.data.tenant.id);
    });

    it("returns 409 Conflict if the admin email is already registered", async () => {
      const res = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "Duplicate Email Labs",
          contactEmail: "contact@duplicate.test",
          admin: {
            name: "Duplicate User",
            email: "admin@apexlabs.test", // Already registered in previous test
            password: "Password123!",
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already exists");

      // Verify no duplicate tenant was created
      const duplicateTenant = await Tenant.findOne({ name: "Duplicate Email Labs" });
      expect(duplicateTenant).toBeNull();
    });

    it("generates an incremented slug when tenant name already exists", async () => {
      const res = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "Apex Medical Labs", // Duplicate name
          contactEmail: "contact2@apexlabs.test",
          admin: {
            name: "Apex Second Admin",
            email: "admin2@apexlabs.test",
            password: "Password123!",
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tenant.slug).toBe("apex-medical-labs-1");
    });
  });

  describe("GET /api/v1/tenants", () => {
    it("returns a paginated list of tenants with userCount", async () => {
      const res = await request(app)
        .get("/api/v1/tenants?page=1&limit=10")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);

      // Verify userCount property exists
      const firstTenant = res.body.data[0];
      expect(firstTenant).toHaveProperty("userCount");
      expect(typeof firstTenant.userCount).toBe("number");
    });

    it("supports search by name using anchored prefix", async () => {
      const res = await request(app)
        .get("/api/v1/tenants?search=Apex")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((t: { name: string }) => t.name.startsWith("Apex"))).toBe(true);
    });

    it("supports filtering by status", async () => {
      // First inactivate one tenant
      await Tenant.findByIdAndUpdate(existingTenantId, { status: TENANT_STATUS.INACTIVE });

      const resActive = await request(app)
        .get(`/api/v1/tenants?status=${TENANT_STATUS.ACTIVE}`)
        .set("Cookie", [superAdminCookie]);

      expect(resActive.status).toBe(200);
      expect(resActive.body.data.every((t: { status: string }) => t.status === TENANT_STATUS.ACTIVE)).toBe(true);

      const resInactive = await request(app)
        .get(`/api/v1/tenants?status=${TENANT_STATUS.INACTIVE}`)
        .set("Cookie", [superAdminCookie]);

      expect(resInactive.status).toBe(200);
      expect(resInactive.body.data.some((t: { id: string }) => t.id === existingTenantId)).toBe(true);
    });
  });

  describe("GET /api/v1/tenants/:id", () => {
    it("returns single tenant details for valid ID", async () => {
      const res = await request(app)
        .get(`/api/v1/tenants/${existingTenantId}`)
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(existingTenantId);
      expect(res.body.data.slug).toBe("global-diagnostics");
    });

    it("returns 404 for nonexistent tenant ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/tenants/${nonExistentId}`)
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("not found");
    });
  });

  describe("PATCH /api/v1/tenants/:id", () => {
    it("updates tenant contact info and status", async () => {
      const res = await request(app)
        .patch(`/api/v1/tenants/${existingTenantId}`)
        .set("Cookie", [superAdminCookie])
        .send({
          contactPhone: "+1-555-9999",
          status: TENANT_STATUS.ACTIVE,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contactPhone).toBe("+1-555-9999");
      expect(res.body.data.status).toBe(TENANT_STATUS.ACTIVE);
    });

    it("returns 404 for updating nonexistent tenant", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/v1/tenants/${nonExistentId}`)
        .set("Cookie", [superAdminCookie])
        .send({ contactPhone: "+1-555-0000" });

      expect(res.status).toBe(404);
    });
  });

  describe("Role-Based Access Control", () => {
    it("returns 403 Forbidden when accessed by non-superadmin (Lab Admin)", async () => {
      const res = await request(app)
        .get("/api/v1/tenants")
        .set("Cookie", [labAdminCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("lacks permission 'tenant:manage'");
    });

    it("returns 401 Unauthorized when no cookie is sent", async () => {
      const res = await request(app).get("/api/v1/tenants");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
