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

describe("Users Module Integration Tests (Supertest)", () => {
  let mongod: MongoMemoryServer;
  let app: Express;

  let labATenantId: string;
  let labBTenantId: string;

  let superAdminId: string;
  let superAdminCookie: string;

  let labAAdminId: string;
  let labAAdminCookie: string;

  let labBAdminId: string;
  let labBAdminCookie: string;

  let doctorCookie: string;
  let receptionistCookie: string;

  let doctorAId: string;
  let doctorBId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    app = createApp();

    // 1. Create two separate tenants: Lab A and Lab B
    const tenantA = await Tenant.create({
      name: "Alpha Diagnostics Lab",
      slug: "alpha-diagnostics-lab",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "admin@alpha.test",
      contactPhone: "+1-555-0101",
    });
    labATenantId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: "Beta Pathology Lab",
      slug: "beta-pathology-lab",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "admin@beta.test",
      contactPhone: "+1-555-0202",
    });
    labBTenantId = tenantB._id.toString();

    // 2. Create Super Admin (no tenant)
    const superAdmin = await User.create({
      name: "Platform Super Admin",
      email: "superadmin@platform.test",
      passwordHash: "hashedPassword123",
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isActive: true,
    });
    superAdminId = superAdmin._id.toString();
    const superAdminToken = signAccessToken({
      id: superAdminId,
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isSuperAdmin: true,
    });
    superAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${superAdminToken}`;

    // 3. Create Lab A Admin
    const labAAdmin = await User.create({
      name: "Alice Lab Admin",
      email: "alice@alpha.test",
      passwordHash: "hashedPassword123",
      role: ROLES.LAB_ADMIN,
      tenantId: tenantA._id,
      isActive: true,
    });
    labAAdminId = labAAdmin._id.toString();
    const labAAdminToken = signAccessToken({
      id: labAAdminId,
      role: ROLES.LAB_ADMIN,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    labAAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${labAAdminToken}`;

    // 4. Create Lab B Admin
    const labBAdmin = await User.create({
      name: "Bob Lab Admin",
      email: "bob@beta.test",
      passwordHash: "hashedPassword123",
      role: ROLES.LAB_ADMIN,
      tenantId: tenantB._id,
      isActive: true,
    });
    labBAdminId = labBAdmin._id.toString();
    const labBAdminToken = signAccessToken({
      id: labBAdminId,
      role: ROLES.LAB_ADMIN,
      tenantId: labBTenantId,
      isSuperAdmin: false,
    });
    labBAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${labBAdminToken}`;

    // 5. Create Staff in Lab A: Doctor and Receptionist
    const doctorA = await User.create({
      name: "Dr. Charlie Alpha",
      email: "charlie@alpha.test",
      passwordHash: "hashedPassword123",
      role: ROLES.DOCTOR,
      tenantId: tenantA._id,
      isActive: true,
    });
    doctorAId = doctorA._id.toString();
    const doctorToken = signAccessToken({
      id: doctorAId,
      role: ROLES.DOCTOR,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    doctorCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${doctorToken}`;

    const receptionistA = await User.create({
      name: "Dana Receptionist",
      email: "dana@alpha.test",
      passwordHash: "hashedPassword123",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantA._id,
      isActive: true,
    });
    const receptionistToken = signAccessToken({
      id: receptionistA._id.toString(),
      role: ROLES.RECEPTIONIST,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    receptionistCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${receptionistToken}`;

    // 6. Create Staff in Lab B: Doctor
    const doctorB = await User.create({
      name: "Dr. Edward Beta",
      email: "edward@beta.test",
      passwordHash: "hashedPassword123",
      role: ROLES.DOCTOR,
      tenantId: tenantB._id,
      isActive: true,
    });
    doctorBId = doctorB._id.toString();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  // ==========================================
  // 1. ROUTE GUARDS & RBAC AUTHORIZATION
  // ==========================================
  describe("Route Protection & RBAC (authenticate & authorize('user:manage'))", () => {
    it("returns 401 when no access token cookie is provided", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 when accessed by a DOCTOR", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [doctorCookie]);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 when accessed by a RECEPTIONIST", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [receptionistCookie]);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("allows access for SUPER_ADMIN", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [superAdminCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows access for LAB_ADMIN", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [labAAdminCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 2. USER CREATION (POST /api/v1/users)
  // ==========================================
  describe("POST /api/v1/users", () => {
    it("Lab Admin creates a DOCTOR inside its own tenant with 201 status", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Dr. Gregory House",
          email: "house@alpha.test",
          password: "Password123!",
          role: ROLES.DOCTOR,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Dr. Gregory House");
      expect(res.body.data.email).toBe("house@alpha.test");
      expect(res.body.data.role).toBe(ROLES.DOCTOR);
      expect(res.body.data.tenantId).toBe(labATenantId);
      expect(res.body.data.tenantName).toBe("Alpha Diagnostics Lab");
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it("Lab Admin creates a RECEPTIONIST inside its own tenant with 201 status", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Pam Beesly",
          email: "pam@alpha.test",
          password: "Password123!",
          role: ROLES.RECEPTIONIST,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.RECEPTIONIST);
      expect(res.body.data.tenantId).toBe(labATenantId);
    });

    it("Lab Admin cannot set tenantId from body (tenantId is forced from req.user)", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Attempt Spoof User",
          email: "spoof@alpha.test",
          password: "Password123!",
          role: ROLES.DOCTOR,
          tenantId: labBTenantId, // Attempt to inject Lab B
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tenantId).toBe(labATenantId); // MUST be Lab A
    });

    it("Lab Admin cannot create a SUPER_ADMIN (returns 403)", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Rogue Super Admin",
          email: "roguesuper@alpha.test",
          password: "Password123!",
          role: ROLES.SUPER_ADMIN,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Lab Admin cannot create a LAB_ADMIN (returns 403)", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Second Lab Admin",
          email: "secondadmin@alpha.test",
          password: "Password123!",
          role: ROLES.LAB_ADMIN,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Super Admin creates a LAB_ADMIN and must send tenantId with 201 status", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "New Lab B Admin",
          email: "admin2@beta.test",
          password: "Password123!",
          role: ROLES.LAB_ADMIN,
          tenantId: labBTenantId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.LAB_ADMIN);
      expect(res.body.data.tenantId).toBe(labBTenantId);
      expect(res.body.data.tenantName).toBe("Beta Pathology Lab");
    });

    it("Super Admin creating user without tenantId returns 400", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "No Tenant User",
          email: "notenant@platform.test",
          password: "Password123!",
          role: ROLES.LAB_ADMIN,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("Super Admin creating user with non-existent tenantId returns 404", async () => {
      const fakeTenantId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "Missing Tenant User",
          email: "missingtenant@platform.test",
          password: "Password123!",
          role: ROLES.LAB_ADMIN,
          tenantId: fakeTenantId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("Super Admin cannot create SUPER_ADMIN user via POST /users (returns 403)", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "Another Super Admin",
          email: "anotherroot@platform.test",
          password: "Password123!",
          role: ROLES.SUPER_ADMIN,
          tenantId: labATenantId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Duplicate email returns 409 Conflict", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Duplicate Email User",
          email: "alice@alpha.test", // Already exists
          password: "Password123!",
          role: ROLES.DOCTOR,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("Fails with 400 for password not meeting complexity requirements", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Weak Password User",
          email: "weak@alpha.test",
          password: "passwordonly", // No numbers
          role: ROLES.DOCTOR,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 3. USER RETRIEVAL & TENANT ISOLATION (GET /api/v1/users/:id)
  // ==========================================
  describe("GET /api/v1/users/:id", () => {
    it("Super Admin can view any user by ID with tenantName", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${doctorAId}`)
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(doctorAId);
      expect(res.body.data.tenantName).toBe("Alpha Diagnostics Lab");
    });

    it("Lab Admin can view a user in their own lab", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${doctorAId}`)
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(doctorAId);
    });

    it("Tenant Isolation: Lab Admin of Lab A gets 404 for a user of Lab B", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${doctorBId}`) // Doctor in Lab B
        .set("Cookie", [labAAdminCookie]); // Lab Admin of Lab A

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("Tenant Isolation: Lab Admin of Lab B gets 404 for a user of Lab A, but 200 for Lab B user", async () => {
      const resA = await request(app)
        .get(`/api/v1/users/${doctorAId}`) // Doctor in Lab A
        .set("Cookie", [labBAdminCookie]); // Lab Admin of Lab B
      expect(resA.status).toBe(404);
      expect(resA.body.success).toBe(false);

      const resB = await request(app)
        .get(`/api/v1/users/${doctorBId}`) // Doctor in Lab B
        .set("Cookie", [labBAdminCookie]); // Lab Admin of Lab B
      expect(resB.status).toBe(200);
      expect(resB.body.success).toBe(true);
      expect(resB.body.data.id).toBe(doctorBId);
    });

    it("returns 404 for non-existent or invalid user ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 4. USER UPDATE & SELF-PROTECTION (PATCH /api/v1/users/:id)
  // ==========================================
  describe("PATCH /api/v1/users/:id", () => {
    it("Nobody can deactivate themselves (Lab Admin returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${labAAdminId}`)
        .set("Cookie", [labAAdminCookie])
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Nobody can deactivate themselves (Super Admin returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${superAdminId}`)
        .set("Cookie", [superAdminCookie])
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Nobody can change their own role (Lab Admin returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${labAAdminId}`)
        .set("Cookie", [labAAdminCookie])
        .send({ role: ROLES.DOCTOR });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Nobody can change their own role (Super Admin returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${superAdminId}`)
        .set("Cookie", [superAdminCookie])
        .send({ role: ROLES.LAB_ADMIN });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("User can update their own name or password", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${labAAdminId}`)
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Alice Updated Admin",
          password: "NewPassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Alice Updated Admin");
    });

    it("Lab Admin cannot change another user's role to SUPER_ADMIN (returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorAId}`)
        .set("Cookie", [labAAdminCookie])
        .send({ role: ROLES.SUPER_ADMIN });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Lab Admin cannot change another user's role to LAB_ADMIN (returns 403)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorAId}`)
        .set("Cookie", [labAAdminCookie])
        .send({ role: ROLES.LAB_ADMIN });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Lab Admin can update staff role (e.g. DOCTOR to RECEPTIONIST) and isActive", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorAId}`)
        .set("Cookie", [labAAdminCookie])
        .send({
          role: ROLES.RECEPTIONIST,
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.RECEPTIONIST);
      expect(res.body.data.isActive).toBe(false);

      // Restore doctor status for subsequent tests
      await User.updateOne(
        { _id: doctorAId },
        { role: ROLES.DOCTOR, isActive: true }
      );
    });

    it("Tenant Isolation: Lab Admin of Lab A cannot update user of Lab B (returns 404)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${doctorBId}`) // User in Lab B
        .set("Cookie", [labAAdminCookie]) // Admin of Lab A
        .send({ name: "Hacked Name" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 5. USER LISTING, SEARCH, FILTERS & PAGINATION (GET /api/v1/users)
  // ==========================================
  describe("GET /api/v1/users (Listing, Search, Filters, Pagination)", () => {
    it("Super Admin sees all users across labs and tenantName is populated", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);

      // Verify tenantName is present for lab users and null for platform super admin
      const labAUser = res.body.data.find(
        (u: { email: string }) => u.email === "charlie@alpha.test"
      );
      expect(labAUser).toBeDefined();
      expect(labAUser.tenantName).toBe("Alpha Diagnostics Lab");

      const superUser = res.body.data.find(
        (u: { email: string }) => u.email === "superadmin@platform.test"
      );
      expect(superUser).toBeDefined();
      expect(superUser.tenantName).toBeNull();
    });

    it("Super Admin can filter users by tenantId", async () => {
      const res = await request(app)
        .get(`/api/v1/users?tenantId=${labBTenantId}`)
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const u of res.body.data) {
        expect(u.tenantId).toBe(labBTenantId);
        expect(u.tenantName).toBe("Beta Pathology Lab");
      }
    });

    it("Tenant Isolation: Lab Admin only sees users of their own lab", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const u of res.body.data) {
        expect(u.tenantId).toBe(labATenantId);
        expect(u.tenantName).toBe("Alpha Diagnostics Lab");
      }
      // Ensure Lab B users are not present
      const labBUser = res.body.data.find(
        (u: { email: string }) => u.email === "edward@beta.test"
      );
      expect(labBUser).toBeUndefined();
    });

    it("filters users by role", async () => {
      const res = await request(app)
        .get(`/api/v1/users?role=${ROLES.DOCTOR}`)
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const u of res.body.data) {
        expect(u.role).toBe(ROLES.DOCTOR);
      }
    });

    it("filters users by isActive status", async () => {
      // Create an inactive user in Lab A
      await User.create({
        name: "Inactive Staff",
        email: "inactive@alpha.test",
        passwordHash: "hash123",
        role: ROLES.RECEPTIONIST,
        tenantId: labATenantId,
        isActive: false,
      });

      const resActive = await request(app)
        .get("/api/v1/users?isActive=true")
        .set("Cookie", [labAAdminCookie]);
      expect(resActive.status).toBe(200);
      for (const u of resActive.body.data) {
        expect(u.isActive).toBe(true);
      }

      const resInactive = await request(app)
        .get("/api/v1/users?isActive=false")
        .set("Cookie", [labAAdminCookie]);
      expect(resInactive.status).toBe(200);
      expect(resInactive.body.data.length).toBeGreaterThanOrEqual(1);
      for (const u of resInactive.body.data) {
        expect(u.isActive).toBe(false);
      }
    });

    it("supports prefix search by name", async () => {
      const res = await request(app)
        .get("/api/v1/users?search=Dr.%20Charlie")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe("charlie@alpha.test");
    });

    it("supports prefix search by email", async () => {
      const res = await request(app)
        .get("/api/v1/users?search=charlie@")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Dr. Charlie Alpha");
    });

    it("handles pagination with limit and page meta", async () => {
      const res = await request(app)
        .get("/api/v1/users?page=1&limit=2")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
    });

    it("supports sorting", async () => {
      const res = await request(app)
        .get("/api/v1/users?sort=name")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      const names: string[] = res.body.data.map((u: { name: string }) => u.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });
  });
});
