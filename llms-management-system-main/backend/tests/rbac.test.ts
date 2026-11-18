import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ROLES } from "../src/constants/roles.js";
import { GENDERS } from "../src/modules/patients/patient.model.js";
import {
  createAuthCookie,
  createTestDatabase,
  createTestPatient,
  createTestTenant,
  createTestUser,
  initCounter,
  type TestDatabase,
} from "./helpers/index.js";

describe("RBAC Comprehensive Matrix Tests (Supertest)", () => {
  let db: TestDatabase;
  let app: Express;

  let tenantId: string;
  let testUserId: string;
  let testPatientId: string;

  let superAdminCookie: string;
  let labAdminCookie: string;
  let doctorCookie: string;
  let receptionistCookie: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp();

    // 1. Create a test tenant
    const tenant = await createTestTenant({ name: "RBAC Diagnostics Lab" });
    tenantId = tenant._id.toString();

    // 2. Initialize sequence counter for the lab
    await initCounter(tenantId, 1);

    // 3. Create users for all 4 roles
    const superAdmin = await createTestUser({
      name: "Platform Super Admin",
      email: "superadmin-rbac@platform.test",
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
    });
    superAdminCookie = createAuthCookie(superAdmin);

    const labAdmin = await createTestUser({
      name: "Alice Lab Admin",
      email: "labadmin-rbac@lab.test",
      role: ROLES.LAB_ADMIN,
      tenantId: tenant._id,
    });
    labAdminCookie = createAuthCookie(labAdmin);

    const doctor = await createTestUser({
      name: "Dr. Gregory House",
      email: "doctor-rbac@lab.test",
      role: ROLES.DOCTOR,
      tenantId: tenant._id,
    });
    doctorCookie = createAuthCookie(doctor);
    testUserId = doctor._id.toString();

    const receptionist = await createTestUser({
      name: "Clara Receptionist",
      email: "receptionist-rbac@lab.test",
      role: ROLES.RECEPTIONIST,
      tenantId: tenant._id,
    });
    receptionistCookie = createAuthCookie(receptionist);

    // 4. Create an existing test patient for route checks
    const patient = await createTestPatient({
      tenantId: tenant._id,
      patientCode: "PT-0001",
      name: "John Doe",
      phone: "+15551234567",
      gender: GENDERS.MALE,
    });
    testPatientId = patient._id.toString();
  }, 60000);

  afterAll(async () => {
    await db.stop();
  }, 30000);

  // ==========================================
  // 1. Route Group: /api/v1/auth
  // ==========================================
  describe("Route Group: /api/v1/auth", () => {
    it("GET /api/v1/auth/me allows all authenticated roles (200) and rejects unauthenticated (401)", async () => {
      // Unauthenticated
      const unauthRes = await request(app).get("/api/v1/auth/me");
      expect(unauthRes.status).toBe(401);

      // SUPER_ADMIN
      const saRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [superAdminCookie]);
      expect(saRes.status).toBe(200);

      // LAB_ADMIN
      const laRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [labAdminCookie]);
      expect(laRes.status).toBe(200);

      // DOCTOR
      const docRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [doctorCookie]);
      expect(docRes.status).toBe(200);

      // RECEPTIONIST
      const recRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [receptionistCookie]);
      expect(recRes.status).toBe(200);
    });
  });

  // ==========================================
  // 2. Route Group: /api/v1/tenants (tenant:manage -> SUPER_ADMIN only)
  // ==========================================
  describe("Route Group: /api/v1/tenants (tenant:manage)", () => {
    it("POST /api/v1/tenants: 201 for SUPER_ADMIN, 403 for LAB_ADMIN, DOCTOR, RECEPTIONIST", async () => {
      const payload = {
        name: "New RBAC Sub-Lab",
        contactEmail: `sublab-${Date.now()}@test.com`,
        contactPhone: "+15559876",
        admin: {
          name: "SubLab Admin",
          email: `subadmin-${Date.now()}@test.com`,
          password: "Password123!",
        },
      };

      // Disallowed roles: 403 Forbidden
      const docRes = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [doctorCookie])
        .send(payload);
      expect(docRes.status).toBe(403);

      const recRes = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [receptionistCookie])
        .send(payload);
      expect(recRes.status).toBe(403);

      const laRes = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [labAdminCookie])
        .send(payload);
      expect(laRes.status).toBe(403);

      // Allowed role: 201 Created
      const saRes = await request(app)
        .post("/api/v1/tenants")
        .set("Cookie", [superAdminCookie])
        .send(payload);
      expect(saRes.status).toBe(201);
    });

    it("GET /api/v1/tenants: 200 for SUPER_ADMIN, 403 for LAB_ADMIN, DOCTOR, RECEPTIONIST", async () => {
      // Disallowed roles: 403
      expect((await request(app).get("/api/v1/tenants").set("Cookie", [labAdminCookie])).status).toBe(403);
      expect((await request(app).get("/api/v1/tenants").set("Cookie", [doctorCookie])).status).toBe(403);
      expect((await request(app).get("/api/v1/tenants").set("Cookie", [receptionistCookie])).status).toBe(403);

      // Allowed role: 200
      const saRes = await request(app).get("/api/v1/tenants").set("Cookie", [superAdminCookie]);
      expect(saRes.status).toBe(200);
      expect(saRes.body.success).toBe(true);
    });

    it("GET /api/v1/tenants/:id: 200 for SUPER_ADMIN, 403 for LAB_ADMIN, DOCTOR, RECEPTIONIST", async () => {
      // Disallowed roles: 403
      expect((await request(app).get(`/api/v1/tenants/${tenantId}`).set("Cookie", [labAdminCookie])).status).toBe(403);
      expect((await request(app).get(`/api/v1/tenants/${tenantId}`).set("Cookie", [doctorCookie])).status).toBe(403);
      expect((await request(app).get(`/api/v1/tenants/${tenantId}`).set("Cookie", [receptionistCookie])).status).toBe(403);

      // Allowed role: 200
      const saRes = await request(app).get(`/api/v1/tenants/${tenantId}`).set("Cookie", [superAdminCookie]);
      expect(saRes.status).toBe(200);
      expect(saRes.body.data.name).toBe("RBAC Diagnostics Lab");
    });

    it("PATCH /api/v1/tenants/:id: 200 for SUPER_ADMIN, 403 for LAB_ADMIN, DOCTOR, RECEPTIONIST", async () => {
      const updatePayload = { contactPhone: "+15554444" };

      // Disallowed roles: 403
      expect((await request(app).patch(`/api/v1/tenants/${tenantId}`).set("Cookie", [labAdminCookie]).send(updatePayload)).status).toBe(403);
      expect((await request(app).patch(`/api/v1/tenants/${tenantId}`).set("Cookie", [doctorCookie]).send(updatePayload)).status).toBe(403);
      expect((await request(app).patch(`/api/v1/tenants/${tenantId}`).set("Cookie", [receptionistCookie]).send(updatePayload)).status).toBe(403);

      // Allowed role: 200
      const saRes = await request(app).patch(`/api/v1/tenants/${tenantId}`).set("Cookie", [superAdminCookie]).send(updatePayload);
      expect(saRes.status).toBe(200);
    });
  });

  // ==========================================
  // 3. Route Group: /api/v1/users (user:manage -> SUPER_ADMIN, LAB_ADMIN)
  // ==========================================
  describe("Route Group: /api/v1/users (user:manage)", () => {
    it("POST /api/v1/users: 201 for SUPER_ADMIN and LAB_ADMIN, 403 for DOCTOR, RECEPTIONIST", async () => {
      const payload = {
        name: "Doctor Extra",
        email: `doc-extra-${Date.now()}@lab.test`,
        password: "Password123!",
        role: ROLES.DOCTOR,
      };

      // Disallowed roles: 403
      expect((await request(app).post("/api/v1/users").set("Cookie", [doctorCookie]).send(payload)).status).toBe(403);
      expect((await request(app).post("/api/v1/users").set("Cookie", [receptionistCookie]).send(payload)).status).toBe(403);

      // Allowed role: LAB_ADMIN creates DOCTOR (201)
      const laRes = await request(app).post("/api/v1/users").set("Cookie", [labAdminCookie]).send(payload);
      expect(laRes.status).toBe(201);

      // Allowed role: SUPER_ADMIN creates LAB_ADMIN with tenantId (201)
      const saPayload = {
        name: "Admin Two",
        email: `admin-two-${Date.now()}@lab.test`,
        password: "Password123!",
        role: ROLES.LAB_ADMIN,
        tenantId,
      };
      const saRes = await request(app).post("/api/v1/users").set("Cookie", [superAdminCookie]).send(saPayload);
      expect(saRes.status).toBe(201);
    });

    it("GET /api/v1/users: 200 for SUPER_ADMIN and LAB_ADMIN, 403 for DOCTOR, RECEPTIONIST", async () => {
      // Disallowed roles: 403
      expect((await request(app).get("/api/v1/users").set("Cookie", [doctorCookie])).status).toBe(403);
      expect((await request(app).get("/api/v1/users").set("Cookie", [receptionistCookie])).status).toBe(403);

      // Allowed roles: 200
      expect((await request(app).get("/api/v1/users").set("Cookie", [superAdminCookie])).status).toBe(200);
      expect((await request(app).get("/api/v1/users").set("Cookie", [labAdminCookie])).status).toBe(200);
    });

    it("GET /api/v1/users/:id: 200 for SUPER_ADMIN and LAB_ADMIN, 403 for DOCTOR, RECEPTIONIST", async () => {
      // Disallowed roles: 403
      expect((await request(app).get(`/api/v1/users/${testUserId}`).set("Cookie", [doctorCookie])).status).toBe(403);
      expect((await request(app).get(`/api/v1/users/${testUserId}`).set("Cookie", [receptionistCookie])).status).toBe(403);

      // Allowed roles: 200
      expect((await request(app).get(`/api/v1/users/${testUserId}`).set("Cookie", [superAdminCookie])).status).toBe(200);
      expect((await request(app).get(`/api/v1/users/${testUserId}`).set("Cookie", [labAdminCookie])).status).toBe(200);
    });

    it("PATCH /api/v1/users/:id: 200 for SUPER_ADMIN and LAB_ADMIN, 403 for DOCTOR, RECEPTIONIST", async () => {
      const updatePayload = { name: "Dr. Gregory House Updated" };

      // Disallowed roles: 403
      expect((await request(app).patch(`/api/v1/users/${testUserId}`).set("Cookie", [doctorCookie]).send(updatePayload)).status).toBe(403);
      expect((await request(app).patch(`/api/v1/users/${testUserId}`).set("Cookie", [receptionistCookie]).send(updatePayload)).status).toBe(403);

      // Allowed roles: 200
      expect((await request(app).patch(`/api/v1/users/${testUserId}`).set("Cookie", [labAdminCookie]).send(updatePayload)).status).toBe(200);
      expect((await request(app).patch(`/api/v1/users/${testUserId}`).set("Cookie", [superAdminCookie]).send(updatePayload)).status).toBe(200);
    });
  });

  // ==========================================
  // 4. Route Group: /api/v1/patients (per-action permissions)
  // ==========================================
  describe("Route Group: /api/v1/patients", () => {
    it("POST /api/v1/patients (patient:create): 201 for LAB_ADMIN, RECEPTIONIST; 403 for SUPER_ADMIN, DOCTOR", async () => {
      const payloadBase = {
        name: "Jane Smith",
        phone: "+15558888001",
        gender: "FEMALE",
        dateOfBirth: "1992-04-10",
        address: "789 Pine Road",
      };

      // Disallowed roles: 403
      expect((await request(app).post("/api/v1/patients").set("Cookie", [superAdminCookie]).send(payloadBase)).status).toBe(403);
      expect((await request(app).post("/api/v1/patients").set("Cookie", [doctorCookie]).send(payloadBase)).status).toBe(403);

      // Allowed role: RECEPTIONIST (201)
      const recRes = await request(app).post("/api/v1/patients").set("Cookie", [receptionistCookie]).send(payloadBase);
      expect(recRes.status).toBe(201);
      expect(recRes.body.data.patientCode).toMatch(/^PT-\d{4}$/);

      // Allowed role: LAB_ADMIN (201)
      const laRes = await request(app).post("/api/v1/patients").set("Cookie", [labAdminCookie]).send({
        ...payloadBase,
        name: "Mark Johnson",
      });
      expect(laRes.status).toBe(201);
      expect(laRes.body.data.patientCode).toMatch(/^PT-\d{4}$/);
    });

    it("GET /api/v1/patients (patient:read): 200 for LAB_ADMIN, DOCTOR, RECEPTIONIST; 403 for SUPER_ADMIN", async () => {
      // Disallowed role: 403 (SUPER_ADMIN does not belong to a lab and cannot access patient medical data)
      expect((await request(app).get("/api/v1/patients").set("Cookie", [superAdminCookie])).status).toBe(403);

      // Allowed roles: 200
      expect((await request(app).get("/api/v1/patients").set("Cookie", [labAdminCookie])).status).toBe(200);
      expect((await request(app).get("/api/v1/patients").set("Cookie", [doctorCookie])).status).toBe(200);
      expect((await request(app).get("/api/v1/patients").set("Cookie", [receptionistCookie])).status).toBe(200);
    });

    it("GET /api/v1/patients/:id (patient:read): 200 for LAB_ADMIN, DOCTOR, RECEPTIONIST; 403 for SUPER_ADMIN", async () => {
      // Disallowed role: 403
      expect((await request(app).get(`/api/v1/patients/${testPatientId}`).set("Cookie", [superAdminCookie])).status).toBe(403);

      // Allowed roles: 200
      expect((await request(app).get(`/api/v1/patients/${testPatientId}`).set("Cookie", [labAdminCookie])).status).toBe(200);
      expect((await request(app).get(`/api/v1/patients/${testPatientId}`).set("Cookie", [doctorCookie])).status).toBe(200);
      expect((await request(app).get(`/api/v1/patients/${testPatientId}`).set("Cookie", [receptionistCookie])).status).toBe(200);
    });

    it("PATCH /api/v1/patients/:id (patient:update): 200 for LAB_ADMIN, RECEPTIONIST; 403 for SUPER_ADMIN, DOCTOR", async () => {
      const updatePayload = { address: "Updated Address 123" };

      // Disallowed roles: 403
      expect((await request(app).patch(`/api/v1/patients/${testPatientId}`).set("Cookie", [superAdminCookie]).send(updatePayload)).status).toBe(403);
      expect((await request(app).patch(`/api/v1/patients/${testPatientId}`).set("Cookie", [doctorCookie]).send(updatePayload)).status).toBe(403);

      // Allowed roles: 200
      expect((await request(app).patch(`/api/v1/patients/${testPatientId}`).set("Cookie", [receptionistCookie]).send(updatePayload)).status).toBe(200);
      expect((await request(app).patch(`/api/v1/patients/${testPatientId}`).set("Cookie", [labAdminCookie]).send(updatePayload)).status).toBe(200);
    });

    it("DELETE /api/v1/patients/:id (patient:delete): 200 for LAB_ADMIN; 403 for SUPER_ADMIN, DOCTOR, RECEPTIONIST", async () => {
      // Disallowed roles: 403
      expect((await request(app).delete(`/api/v1/patients/${testPatientId}`).set("Cookie", [superAdminCookie])).status).toBe(403);
      expect((await request(app).delete(`/api/v1/patients/${testPatientId}`).set("Cookie", [doctorCookie])).status).toBe(403);
      expect((await request(app).delete(`/api/v1/patients/${testPatientId}`).set("Cookie", [receptionistCookie])).status).toBe(403);

      // Allowed role: 200 (Soft delete by LAB_ADMIN)
      const laRes = await request(app).delete(`/api/v1/patients/${testPatientId}`).set("Cookie", [labAdminCookie]);
      expect(laRes.status).toBe(200);
      expect(laRes.body.success).toBe(true);
      expect(laRes.body.data.isActive).toBe(false);
    });
  });

  // ==========================================
  // 5. Route Group: /api/v1/dashboard (dashboard:read -> all authenticated roles)
  // ==========================================
  describe("Route Group: /api/v1/dashboard (dashboard:read)", () => {
    it("GET /api/v1/dashboard/stats: 200 for all roles, 401 unauthenticated", async () => {
      // Unauthenticated: 401
      expect((await request(app).get("/api/v1/dashboard/stats")).status).toBe(401);

      // All authenticated roles allowed: 200
      expect((await request(app).get("/api/v1/dashboard/stats").set("Cookie", [superAdminCookie])).status).toBe(200);
      expect((await request(app).get("/api/v1/dashboard/stats").set("Cookie", [labAdminCookie])).status).toBe(200);
      expect((await request(app).get("/api/v1/dashboard/stats").set("Cookie", [doctorCookie])).status).toBe(200);
      expect((await request(app).get("/api/v1/dashboard/stats").set("Cookie", [receptionistCookie])).status).toBe(200);
    });
  });
});
