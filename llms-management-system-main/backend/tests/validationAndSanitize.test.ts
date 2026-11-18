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

describe("Validation and Sanitize Security Tests (Operator Injection & Input Guarding)", () => {
  let db: TestDatabase;
  let app: Express;

  let tenantId: string;
  let labAdminCookie: string;
  let receptionistCookie: string;
  let existingPatientId: string;
  let existingUserId: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp();

    // 1. Create a test tenant
    const tenant = await createTestTenant({ name: "Security Validation Lab" });
    tenantId = tenant._id.toString();

    // 2. Initialize counter
    await initCounter(tenantId, 1);

    // 3. Create lab admin and receptionist
    const labAdmin = await createTestUser({
      name: "Security Admin",
      email: "secadmin@lab.test",
      role: ROLES.LAB_ADMIN,
      tenantId: tenant._id,
      plainPassword: "ValidPassword123!",
    });
    labAdminCookie = createAuthCookie(labAdmin);

    const receptionist = await createTestUser({
      name: "Security Receptionist",
      email: "secrec@lab.test",
      role: ROLES.RECEPTIONIST,
      tenantId: tenant._id,
    });
    receptionistCookie = createAuthCookie(receptionist);
    existingUserId = receptionist._id.toString();

    // 4. Create an existing patient for update tests
    const patient = await createTestPatient({
      tenantId: tenant._id,
      patientCode: "PT-0001",
      name: "Target Patient",
      phone: "+15551234567",
      gender: GENDERS.FEMALE,
    });
    existingPatientId = patient._id.toString();
  }, 60000);

  afterAll(async () => {
    await db.stop();
  }, 30000);

  // ==========================================
  // 1. Operator Injection on /api/v1/auth/login
  // ==========================================
  describe("Auth Login Operator Injection Prevention", () => {
    it("operator injection payload { email: { $ne: null } } returns 400 Validation failed", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: { $ne: null },
          password: "ValidPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((err: { field: string }) => err.field === "email")).toBe(true);
    });

    it("operator injection payload { password: { $gt: '' } } returns 400 Validation failed", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "secadmin@lab.test",
          password: { $gt: "" },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "password")).toBe(true);
    });

    it("strips top-level Mongo operator keys like $where without crashing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          $where: "sleep(5000)",
          email: "secadmin@lab.test",
          password: "ValidPassword123!",
        });

      // Login succeeds because $where was safely stripped and valid credentials were provided
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("secadmin@lab.test");
    });
  });

  // ==========================================
  // 2. Operator Injection on /api/v1/users
  // ==========================================
  describe("Users Operator Injection & Sanitization", () => {
    it("POST /api/v1/users with { email: { $ne: null } } returns 400", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAdminCookie])
        .send({
          email: { $ne: null },
          name: "Doctor Injected",
          password: "Password123!",
          role: ROLES.DOCTOR,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "email")).toBe(true);
    });

    it("POST /api/v1/users with { role: { $ne: 'DOCTOR' } } returns 400", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAdminCookie])
        .send({
          email: "valid-doc@lab.test",
          name: "Doctor Valid",
          password: "Password123!",
          role: { $ne: "DOCTOR" },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "role")).toBe(true);
    });

    it("PATCH /api/v1/users/:id with { name: { $ne: null } } returns 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${existingUserId}`)
        .set("Cookie", [labAdminCookie])
        .send({
          name: { $ne: null },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "name")).toBe(true);
    });

    it("POST /api/v1/users strips dot-notation keys (e.g. 'user.role')", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Cookie", [labAdminCookie])
        .send({
          "user.role": ROLES.SUPER_ADMIN,
          name: "Staff Doctor",
          email: `doc-clean-${Date.now()}@lab.test`,
          password: "Password123!",
          role: ROLES.DOCTOR,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe(ROLES.DOCTOR);
      expect((res.body.data as Record<string, unknown>)["user.role"]).toBeUndefined();
    });
  });

  // ==========================================
  // 3. Operator Injection on /api/v1/patients
  // ==========================================
  describe("Patients Operator Injection & Sanitization", () => {
    it("POST /api/v1/patients with { name: { $regex: '.*' } } returns 400", async () => {
      const res = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [receptionistCookie])
        .send({
          name: { $regex: ".*" },
          phone: "+15559876543",
          gender: "MALE",
          dateOfBirth: "1992-05-15",
          address: "123 Safe St",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "name")).toBe(true);
    });

    it("POST /api/v1/patients with { phone: { $ne: null } } returns 400", async () => {
      const res = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [receptionistCookie])
        .send({
          name: "Real Patient",
          phone: { $ne: null },
          gender: "FEMALE",
          dateOfBirth: "1994-08-20",
          address: "456 Avenue",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "phone")).toBe(true);
    });

    it("POST /api/v1/patients with { gender: { $ne: 'MALE' } } returns 400", async () => {
      const res = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [receptionistCookie])
        .send({
          name: "Real Patient",
          phone: "+15559876543",
          gender: { $ne: "MALE" },
          dateOfBirth: "1994-08-20",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "gender")).toBe(true);
    });

    it("PATCH /api/v1/patients/:id with { name: { $gt: '' } } returns 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/patients/${existingPatientId}`)
        .set("Cookie", [receptionistCookie])
        .send({
          name: { $gt: "" },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "name")).toBe(true);
    });

    it("PATCH /api/v1/patients/:id with { phone: { $ne: null } } returns 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/patients/${existingPatientId}`)
        .set("Cookie", [receptionistCookie])
        .send({
          phone: { $ne: null },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors.some((err: { field: string }) => err.field === "phone")).toBe(true);
    });
  });

  // ==========================================
  // 4. Safe Regex Escaping
  // ==========================================
  describe("Safe Regex Escaping on Search", () => {
    it("regex meta-characters in search query are escaped and treated literally without ReDoS", async () => {
      const res = await request(app)
        .get("/api/v1/patients?search=.*")
        .set("Cookie", [receptionistCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // ".*" does not wildcard-match everything because paginate escapes regex meta-characters
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });
  });
});
