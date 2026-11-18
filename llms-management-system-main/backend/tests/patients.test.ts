import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ROLES } from "../src/constants/roles.js";
import { Counter } from "../src/modules/patients/counter.model.js";
import { GENDERS, Patient } from "../src/modules/patients/patient.model.js";
import { Tenant, TENANT_STATUS } from "../src/modules/tenants/tenant.model.js";
import { User } from "../src/modules/users/user.model.js";
import { COOKIE_NAMES } from "../src/utils/cookies.js";
import { signAccessToken } from "../src/utils/tokens.js";

describe("Patients Module Integration Tests (Supertest)", () => {
  let mongod: MongoMemoryServer;
  let app: Express;

  let labATenantId: string;
  let labBTenantId: string;

  let superAdminCookie: string;
  let labAAdminCookie: string;
  let doctorACookie: string;
  let receptionistACookie: string;

  let labBAdminCookie: string;
  let doctorBCookie: string;

  let patientAId: string;
  let patientBId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    app = createApp();

    // 1. Create two distinct laboratories (tenants)
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
      name: "Root Super Admin",
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

    // 3. Lab A Staff: Admin, Doctor, Receptionist
    const labAAdmin = await User.create({
      name: "Alice Lab Admin",
      email: "alice@alpha.test",
      passwordHash: "hash123",
      role: ROLES.LAB_ADMIN,
      tenantId: tenantA._id,
      isActive: true,
    });
    const labAAdminToken = signAccessToken({
      id: labAAdmin._id.toString(),
      role: ROLES.LAB_ADMIN,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    labAAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${labAAdminToken}`;

    const doctorA = await User.create({
      name: "Dr. Gregory House",
      email: "house@alpha.test",
      passwordHash: "hash123",
      role: ROLES.DOCTOR,
      tenantId: tenantA._id,
      isActive: true,
    });
    const doctorAToken = signAccessToken({
      id: doctorA._id.toString(),
      role: ROLES.DOCTOR,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    doctorACookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${doctorAToken}`;

    const receptionistA = await User.create({
      name: "Pam Receptionist",
      email: "pam@alpha.test",
      passwordHash: "hash123",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantA._id,
      isActive: true,
    });
    const receptionistAToken = signAccessToken({
      id: receptionistA._id.toString(),
      role: ROLES.RECEPTIONIST,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    receptionistACookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${receptionistAToken}`;

    // 4. Lab B Staff: Admin, Doctor
    const labBAdmin = await User.create({
      name: "Bob Lab Admin",
      email: "bob@beta.test",
      passwordHash: "hash123",
      role: ROLES.LAB_ADMIN,
      tenantId: tenantB._id,
      isActive: true,
    });
    const labBAdminToken = signAccessToken({
      id: labBAdmin._id.toString(),
      role: ROLES.LAB_ADMIN,
      tenantId: labBTenantId,
      isSuperAdmin: false,
    });
    labBAdminCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${labBAdminToken}`;

    const doctorB = await User.create({
      name: "Dr. James Wilson",
      email: "wilson@beta.test",
      passwordHash: "hash123",
      role: ROLES.DOCTOR,
      tenantId: tenantB._id,
      isActive: true,
    });
    const doctorBToken = signAccessToken({
      id: doctorB._id.toString(),
      role: ROLES.DOCTOR,
      tenantId: labBTenantId,
      isSuperAdmin: false,
    });
    doctorBCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${doctorBToken}`;

    // 5. Create baseline patients in Lab A and Lab B and initialize Counter seq to 1
    await Counter.create({
      tenantId: tenantA._id,
      key: "patientCode",
      seq: 1,
    });
    await Counter.create({
      tenantId: tenantB._id,
      key: "patientCode",
      seq: 1,
    });

    const patientA = await Patient.create({
      tenantId: tenantA._id,
      patientCode: "PT-0001",
      name: "Arthur Dent",
      phone: "+15551234567",
      gender: GENDERS.MALE,
      dateOfBirth: new Date("1980-03-11"),
      address: "42 Galaxy Way",
      isActive: true,
      createdBy: labAAdmin._id,
      updatedBy: labAAdmin._id,
    });
    patientAId = patientA._id.toString();

    const patientB = await Patient.create({
      tenantId: tenantB._id,
      patientCode: "PT-0001",
      name: "Ford Prefect",
      phone: "+15559876543",
      gender: GENDERS.OTHER,
      dateOfBirth: new Date("1978-07-20"),
      address: "Betelgeuse Five",
      isActive: true,
      createdBy: labBAdmin._id,
      updatedBy: labBAdmin._id,
    });
    patientBId = patientB._id.toString();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  // ==========================================
  // 1. RBAC PER ROLE
  // ==========================================
  describe("RBAC per role", () => {
    it("returns 401 when request has no authentication cookie", async () => {
      const res = await request(app).get("/api/v1/patients");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("SUPER_ADMIN cannot access patient endpoints (returns 403)", async () => {
      const getList = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", [superAdminCookie]);
      expect(getList.status).toBe(403);

      const postPatient = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [superAdminCookie])
        .send({
          name: "Test Patient",
          phone: "+15551112233",
          gender: GENDERS.MALE,
          dateOfBirth: "1990-01-01",
        });
      expect(postPatient.status).toBe(403);

      const getSingle = await request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [superAdminCookie]);
      expect(getSingle.status).toBe(403);

      const patchPatient = await request(app)
        .patch(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [superAdminCookie])
        .send({ name: "Updated Name" });
      expect(patchPatient.status).toBe(403);

      const deletePatient = await request(app)
        .delete(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [superAdminCookie]);
      expect(deletePatient.status).toBe(403);
    });

    it("DOCTOR has read-only access (GET: 200, POST/PATCH/DELETE: 403)", async () => {
      // Allowed: GET list
      const getList = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", [doctorACookie]);
      expect(getList.status).toBe(200);
      expect(getList.body.success).toBe(true);

      // Allowed: GET single
      const getSingle = await request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [doctorACookie]);
      expect(getSingle.status).toBe(200);
      expect(getSingle.body.data.id).toBe(patientAId);

      // Denied: POST
      const postRes = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [doctorACookie])
        .send({
          name: "Doctor Registered",
          phone: "+15552223344",
          gender: GENDERS.FEMALE,
          dateOfBirth: "1992-05-10",
        });
      expect(postRes.status).toBe(403);

      // Denied: PATCH
      const patchRes = await request(app)
        .patch(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [doctorACookie])
        .send({ name: "Doctor Modified" });
      expect(patchRes.status).toBe(403);

      // Denied: DELETE
      const deleteRes = await request(app)
        .delete(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [doctorACookie]);
      expect(deleteRes.status).toBe(403);
    });

    it("RECEPTIONIST can create, read, and edit (GET: 200, POST: 201, PATCH: 200, DELETE: 403)", async () => {
      // Allowed: GET list
      const getList = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", [receptionistACookie]);
      expect(getList.status).toBe(200);

      // Allowed: POST create
      const postRes = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [receptionistACookie])
        .send({
          name: "Tricia McMillan",
          phone: "+15553334455",
          gender: GENDERS.FEMALE,
          dateOfBirth: "1985-06-15",
          address: "Islington, London",
        });
      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.patientCode).toBeDefined();
      const createdId = postRes.body.data.id;

      // Allowed: PATCH update
      const patchRes = await request(app)
        .patch(`/api/v1/patients/${createdId}`)
        .set("Cookie", [receptionistACookie])
        .send({ name: "Trillian Astra" });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.name).toBe("Trillian Astra");

      // Denied: DELETE (only Lab Admin can delete)
      const deleteRes = await request(app)
        .delete(`/api/v1/patients/${createdId}`)
        .set("Cookie", [receptionistACookie]);
      expect(deleteRes.status).toBe(403);
    });

    it("LAB_ADMIN has full access (GET: 200, POST: 201, PATCH: 200, DELETE: 200)", async () => {
      // Create patient
      const postRes = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Zaphod Beeblebrox",
          phone: "+15557778899",
          gender: GENDERS.MALE,
          dateOfBirth: "1975-11-25",
        });
      expect(postRes.status).toBe(201);
      const patientId = postRes.body.data.id;

      // Read
      const getRes = await request(app)
        .get(`/api/v1/patients/${patientId}`)
        .set("Cookie", [labAAdminCookie]);
      expect(getRes.status).toBe(200);

      // Update
      const patchRes = await request(app)
        .patch(`/api/v1/patients/${patientId}`)
        .set("Cookie", [labAAdminCookie])
        .send({ address: "Heart of Gold" });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.address).toBe("Heart of Gold");

      // Delete (soft delete)
      const deleteRes = await request(app)
        .delete(`/api/v1/patients/${patientId}`)
        .set("Cookie", [labAAdminCookie]);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.isActive).toBe(false);
    });
  });

  // ==========================================
  // 2. TENANT ISOLATION
  // ==========================================
  describe("Tenant Isolation", () => {
    it("Lab A staff (Admin, Doctor, Receptionist) cannot view Lab B patient (returns 404)", async () => {
      // Lab A Admin
      const resAdmin = await request(app)
        .get(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [labAAdminCookie]);
      expect(resAdmin.status).toBe(404);

      // Lab A Doctor
      const resDoc = await request(app)
        .get(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [doctorACookie]);
      expect(resDoc.status).toBe(404);

      // Lab A Receptionist
      const resRecep = await request(app)
        .get(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [receptionistACookie]);
      expect(resRecep.status).toBe(404);
    });

    it("Lab A Admin cannot edit Lab B patient (returns 404)", async () => {
      const res = await request(app)
        .patch(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [labAAdminCookie])
        .send({ name: "Cross-Tenant Edit" });
      expect(res.status).toBe(404);
    });

    it("Lab A Admin cannot delete Lab B patient (returns 404)", async () => {
      const res = await request(app)
        .delete(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [labAAdminCookie]);
      expect(res.status).toBe(404);
    });

    it("Lab A staff listing patients never sees Lab B patients", async () => {
      const res = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", [doctorACookie]);

      expect(res.status).toBe(200);
      const names: string[] = res.body.data.map((p: { name: string }) => p.name);
      expect(names).not.toContain("Ford Prefect"); // Ford Prefect is in Lab B
    });

    it("Lab B Admin cannot delete Lab A patient (returns 404), but can delete Lab B patient", async () => {
      const resA = await request(app)
        .delete(`/api/v1/patients/${patientAId}`)
        .set("Cookie", [labBAdminCookie]);
      expect(resA.status).toBe(404);

      const resB = await request(app)
        .delete(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [labBAdminCookie]);
      expect(resB.status).toBe(200);
      expect(resB.body.data.isActive).toBe(false);
    });

    it("Lab B staff can access Lab B patient (returns 200)", async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patientBId}`)
        .set("Cookie", [doctorBCookie]);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(patientBId);
      expect(res.body.data.name).toBe("Ford Prefect");
    });
  });

  // ==========================================
  // 3. PAGINATION & META
  // ==========================================
  describe("Pagination and Meta", () => {
    it("returns correct pagination metadata (total, page, limit, totalPages)", async () => {
      const res = await request(app)
        .get("/api/v1/patients?page=1&limit=2")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(typeof res.body.meta.total).toBe("number");
      expect(typeof res.body.meta.totalPages).toBe("number");
    });

    it("caps limit at 100", async () => {
      const res = await request(app)
        .get("/api/v1/patients?limit=250")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(100);
    });
  });

  // ==========================================
  // 4. SEARCH (NAME OR PHONE PREFIX)
  // ==========================================
  describe("Search", () => {
    it("matches name by anchored escaped prefix", async () => {
      const res = await request(app)
        .get("/api/v1/patients?search=Arthur")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toBe("Arthur Dent");
    });

    it("matches phone by anchored prefix including '+' character safely", async () => {
      const res = await request(app)
        .get("/api/v1/patients?search=%2B1555123")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].phone).toBe("+15551234567");
    });
  });

  // ==========================================
  // 5. SORTING & FILTERS
  // ==========================================
  describe("Sorting and Gender Filter", () => {
    it("filters patients by gender", async () => {
      const res = await request(app)
        .get(`/api/v1/patients?gender=${GENDERS.MALE}`)
        .set("Cookie", [doctorACookie]);

      expect(res.status).toBe(200);
      for (const p of res.body.data) {
        expect(p.gender).toBe(GENDERS.MALE);
      }
    });

    it("sorts patients by name", async () => {
      const res = await request(app)
        .get("/api/v1/patients?sort=name")
        .set("Cookie", [doctorACookie]);

      expect(res.status).toBe(200);
      const names: string[] = res.body.data.map((p: { name: string }) => p.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });
  });

  // ==========================================
  // 6. SOFT DELETE
  // ==========================================
  describe("Soft Delete", () => {
    it("sets isActive to false and excludes patient from subsequent lists", async () => {
      // 1. Create a patient to soft delete
      const createRes = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", [labAAdminCookie])
        .send({
          name: "Slartibartfast",
          phone: "+15558889900",
          gender: GENDERS.MALE,
          dateOfBirth: "1960-04-01",
        });
      expect(createRes.status).toBe(201);
      const targetId = createRes.body.data.id;

      // 2. Soft delete via DELETE /patients/:id
      const delRes = await request(app)
        .delete(`/api/v1/patients/${targetId}`)
        .set("Cookie", [labAAdminCookie]);
      expect(delRes.status).toBe(200);
      expect(delRes.body.data.isActive).toBe(false);

      // 3. Verify patient is excluded from GET /patients list
      const listRes = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", [labAAdminCookie]);
      expect(listRes.status).toBe(200);
      const ids: string[] = listRes.body.data.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(targetId);

      // 4. Verify patient document still exists in database with isActive: false
      const singleRes = await request(app)
        .get(`/api/v1/patients/${targetId}`)
        .set("Cookie", [labAAdminCookie]);
      expect(singleRes.status).toBe(200);
      expect(singleRes.body.data.isActive).toBe(false);
    });
  });

  // ==========================================
  // 7. 20 CONCURRENT CREATIONS & UNIQUE CODES
  // ==========================================
  describe("Concurrent Patient Registrations", () => {
    it("20 simultaneous registrations produce 20 unique zero-padded codes (PT-0001 format)", async () => {
      const concurrentRequests = Array.from({ length: 20 }, (_, index) => {
        return request(app)
          .post("/api/v1/patients")
          .set("Cookie", [receptionistACookie])
          .send({
            name: `Concurrent Patient ${index + 1}`,
            phone: `+1555000${String(1000 + index).slice(-4)}`,
            gender: index % 2 === 0 ? GENDERS.MALE : GENDERS.FEMALE,
            dateOfBirth: "1995-08-20",
          });
      });

      const responses = await Promise.all(concurrentRequests);

      // Verify all 20 succeeded with 201
      for (const res of responses) {
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.patientCode).toMatch(/^PT-\d{4,}$/);
      }

      // Verify all 20 generated codes are strictly unique
      const generatedCodes = responses.map((r) => r.body.data.patientCode);
      const uniqueCodes = new Set(generatedCodes);
      expect(uniqueCodes.size).toBe(20);
    });
  });
});
