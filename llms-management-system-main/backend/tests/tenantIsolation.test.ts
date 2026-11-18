import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ROLES } from "../src/constants/roles.js";
import { GENDERS, Patient } from "../src/modules/patients/patient.model.js";
import { User } from "../src/modules/users/user.model.js";
import {
  createAuthCookie,
  createTestDatabase,
  createTestPatient,
  createTestTenant,
  createTestUser,
  initCounter,
  type TestDatabase,
} from "./helpers/index.js";

describe("Tenant Isolation Tests (Lab A vs Lab B)", () => {
  let db: TestDatabase;
  let app: Express;

  let labAId: string;
  let labBId: string;

  let labAAdminCookie: string;
  let labADoctorCookie: string;
  let labAReceptionistCookie: string;

  let labBAdminCookie: string;
  let labBDoctorCookie: string;
  let labBReceptionistCookie: string;

  let superAdminCookie: string;

  let labAUser1Id: string;
  let labAUser2Id: string;
  let labBUser1Id: string;

  let patientA1Id: string;
  let patientA2Id: string;
  let patientB1Id: string;
  let patientB2Id: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp();

    // 1. Create two distinct laboratories (tenants)
    const tenantA = await createTestTenant({
      name: "Alpha Laboratory",
      slug: "alpha-laboratory",
    });
    labAId = tenantA._id.toString();

    const tenantB = await createTestTenant({
      name: "Beta Laboratory",
      slug: "beta-laboratory",
    });
    labBId = tenantB._id.toString();

    // 2. Initialize counters for sequence generation
    await initCounter(labAId, 2);
    await initCounter(labBId, 2);

    // 3. Create Super Admin (cross-tenant visibility test)
    const superAdmin = await createTestUser({
      name: "Global Super Admin",
      email: "superadmin-isolation@platform.test",
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
    });
    superAdminCookie = createAuthCookie(superAdmin);

    // 4. Lab A Staff
    const labAAdmin = await createTestUser({
      name: "Alice Lab A Admin",
      email: "admin@alpha-lab.test",
      role: ROLES.LAB_ADMIN,
      tenantId: tenantA._id,
    });
    labAAdminCookie = createAuthCookie(labAAdmin);

    const labADoctor = await createTestUser({
      name: "Dr. Arthur Alpha",
      email: "doctor@alpha-lab.test",
      role: ROLES.DOCTOR,
      tenantId: tenantA._id,
    });
    labADoctorCookie = createAuthCookie(labADoctor);
    labAUser1Id = labADoctor._id.toString();

    const labAReceptionist = await createTestUser({
      name: "Amy Alpha Reception",
      email: "rec@alpha-lab.test",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantA._id,
    });
    labAReceptionistCookie = createAuthCookie(labAReceptionist);
    labAUser2Id = labAReceptionist._id.toString();

    // 5. Lab B Staff
    const labBAdmin = await createTestUser({
      name: "Bob Lab B Admin",
      email: "admin@beta-lab.test",
      role: ROLES.LAB_ADMIN,
      tenantId: tenantB._id,
    });
    labBAdminCookie = createAuthCookie(labBAdmin);

    const labBDoctor = await createTestUser({
      name: "Dr. Brian Beta",
      email: "doctor@beta-lab.test",
      role: ROLES.DOCTOR,
      tenantId: tenantB._id,
    });
    labBDoctorCookie = createAuthCookie(labBDoctor);
    labBUser1Id = labBDoctor._id.toString();

    const labBReceptionist = await createTestUser({
      name: "Bella Beta Reception",
      email: "rec@beta-lab.test",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantB._id,
    });
    labBReceptionistCookie = createAuthCookie(labBReceptionist);

    // 6. Patients in Lab A
    const patientA1 = await createTestPatient({
      tenantId: tenantA._id,
      patientCode: "PT-0001",
      name: "Albert Alpha",
      phone: "+15551111001",
      gender: GENDERS.MALE,
    });
    patientA1Id = patientA1._id.toString();

    const patientA2 = await createTestPatient({
      tenantId: tenantA._id,
      patientCode: "PT-0002",
      name: "Abigail Alpha",
      phone: "+15551112002",
      gender: GENDERS.FEMALE,
    });
    patientA2Id = patientA2._id.toString();

    // 7. Patients in Lab B
    const patientB1 = await createTestPatient({
      tenantId: tenantB._id,
      patientCode: "PT-0001", // Notice: PT-0001 exists in both labs with no collision!
      name: "Brandon Beta",
      phone: "+15552221001",
      gender: GENDERS.MALE,
    });
    patientB1Id = patientB1._id.toString();

    const patientB2 = await createTestPatient({
      tenantId: tenantB._id,
      patientCode: "PT-0002",
      name: "Brenda Beta",
      phone: "+15552222002",
      gender: GENDERS.FEMALE,
    });
    patientB2Id = patientB2._id.toString();
  }, 60000);

  afterAll(async () => {
    await db.stop();
  }, 30000);

  // ==========================================
  // Section 1: Tenant Isolation across USERS
  // ==========================================
  describe("Users Tenant Isolation", () => {
    it("LIST: Lab A Admin only sees Lab A users, 0 Lab B users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const users = res.body.data as Array<{ _id: string; email: string }>;
      expect(users.length).toBeGreaterThan(0);

      // Verify no user from Lab B appears in the response
      const emails = users.map((u) => u.email);
      expect(emails).toContain("admin@alpha-lab.test");
      expect(emails).toContain("doctor@alpha-lab.test");
      expect(emails).toContain("rec@alpha-lab.test");
      expect(emails).not.toContain("admin@beta-lab.test");
      expect(emails).not.toContain("doctor@beta-lab.test");
      expect(emails).not.toContain("rec@beta-lab.test");

      // Verify meta.total strictly reflects Lab A's count
      expect(res.body.meta.total).toBe(3);
    });

    it("LIST: Lab B Admin only sees Lab B users, 0 Lab A users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Cookie", [labBAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const users = res.body.data as Array<{ _id: string; email: string }>;
      const emails = users.map((u) => u.email);
      expect(emails).toContain("admin@beta-lab.test");
      expect(emails).toContain("doctor@beta-lab.test");
      expect(emails).toContain("rec@beta-lab.test");
      expect(emails).not.toContain("admin@alpha-lab.test");
      expect(emails).not.toContain("doctor@alpha-lab.test");

      expect(res.body.meta.total).toBe(3);
    });

    it("READ: Lab A Admin cannot read a Lab B user by ID (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${labBUser1Id}`)
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("READ: Lab B Admin cannot read a Lab A user by ID (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/v1/users/${labAUser1Id}`)
        .set("Cookie", [labBAdminCookie]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("EDIT: Lab A Admin cannot update a Lab B user (returns 404, no DB modification)", async () => {
      const originalUserB = await User.findById(labBUser1Id);
      const originalName = originalUserB?.name;

      const res = await request(app)
        .patch(`/api/v1/users/${labBUser1Id}`)
        .set("Cookie", [labAAdminCookie])
        .send({ name: "Tampered by Lab A Admin" });

      expect(res.status).toBe(404);

      // Verify the user in the database was NOT altered
      const unmodifiedUserB = await User.findById(labBUser1Id);
      expect(unmodifiedUserB?.name).toBe(originalName);
    });

    it("EDIT: Lab B Admin cannot update a Lab A user (returns 404, no DB modification)", async () => {
      const originalUserA = await User.findById(labAUser2Id);
      const originalName = originalUserA?.name;

      const res = await request(app)
        .patch(`/api/v1/users/${labAUser2Id}`)
        .set("Cookie", [labBAdminCookie])
        .send({ name: "Tampered by Lab B Admin" });

      expect(res.status).toBe(404);

      const unmodifiedUserA = await User.findById(labAUser2Id);
      expect(unmodifiedUserA?.name).toBe(originalName);
    });
  });

  // ==========================================
  // Section 2: Tenant Isolation across PATIENTS
  // ==========================================
  describe("Patients Tenant Isolation", () => {
    it("LIST: Lab A staff only sees Lab A patients, 0 Lab B patients", async () => {
      // Test across all allowed roles in Lab A
      for (const cookie of [labAAdminCookie, labADoctorCookie, labAReceptionistCookie]) {
        const res = await request(app)
          .get("/api/v1/patients")
          .set("Cookie", [cookie]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const patients = res.body.data as Array<{ _id: string; name: string }>;
        const names = patients.map((p) => p.name);

        expect(names).toContain("Albert Alpha");
        expect(names).toContain("Abigail Alpha");
        expect(names).not.toContain("Brandon Beta");
        expect(names).not.toContain("Brenda Beta");

        expect(res.body.meta.total).toBe(2);
      }
    });

    it("LIST: Lab B staff only sees Lab B patients, 0 Lab A patients", async () => {
      for (const cookie of [labBAdminCookie, labBDoctorCookie, labBReceptionistCookie]) {
        const res = await request(app)
          .get("/api/v1/patients")
          .set("Cookie", [cookie]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const patients = res.body.data as Array<{ _id: string; name: string }>;
        const names = patients.map((p) => p.name);

        expect(names).toContain("Brandon Beta");
        expect(names).toContain("Brenda Beta");
        expect(names).not.toContain("Albert Alpha");
        expect(names).not.toContain("Abigail Alpha");

        expect(res.body.meta.total).toBe(2);
      }
    });

    it("READ: Lab A staff (Admin, Doctor, Receptionist) cannot read Lab B patient (returns 404)", async () => {
      for (const cookie of [labAAdminCookie, labADoctorCookie, labAReceptionistCookie]) {
        const res = await request(app)
          .get(`/api/v1/patients/${patientB1Id}`)
          .set("Cookie", [cookie]);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      }
    });

    it("READ: Lab B staff cannot read Lab A patient (returns 404)", async () => {
      for (const cookie of [labBAdminCookie, labBDoctorCookie, labBReceptionistCookie]) {
        const res = await request(app)
          .get(`/api/v1/patients/${patientA1Id}`)
          .set("Cookie", [cookie]);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      }
    });

    it("EDIT: Lab A staff (Admin, Receptionist) cannot edit Lab B patient (returns 404, no DB changes)", async () => {
      const originalPatientB = await Patient.findById(patientB1Id);
      const originalName = originalPatientB?.name;

      for (const cookie of [labAAdminCookie, labAReceptionistCookie]) {
        const res = await request(app)
          .patch(`/api/v1/patients/${patientB1Id}`)
          .set("Cookie", [cookie])
          .send({ name: "Malicious Edit from Lab A" });

        expect(res.status).toBe(404);
      }

      const unmodifiedPatientB = await Patient.findById(patientB1Id);
      expect(unmodifiedPatientB?.name).toBe(originalName);
    });

    it("EDIT: Lab B staff cannot edit Lab A patient (returns 404, no DB changes)", async () => {
      const originalPatientA = await Patient.findById(patientA1Id);
      const originalName = originalPatientA?.name;

      for (const cookie of [labBAdminCookie, labBReceptionistCookie]) {
        const res = await request(app)
          .patch(`/api/v1/patients/${patientA1Id}`)
          .set("Cookie", [cookie])
          .send({ name: "Malicious Edit from Lab B" });

        expect(res.status).toBe(404);
      }

      const unmodifiedPatientA = await Patient.findById(patientA1Id);
      expect(unmodifiedPatientA?.name).toBe(originalName);
    });

    it("DELETE: Lab A Admin cannot soft delete Lab B patient (returns 404, isActive remains true)", async () => {
      const res = await request(app)
        .delete(`/api/v1/patients/${patientB2Id}`)
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(404);

      // Verify the patient is still active in MongoDB
      const patientB2 = await Patient.findById(patientB2Id);
      expect(patientB2?.isActive).toBe(true);
    });

    it("DELETE: Lab B Admin cannot soft delete Lab A patient (returns 404, isActive remains true)", async () => {
      const res = await request(app)
        .delete(`/api/v1/patients/${patientA2Id}`)
        .set("Cookie", [labBAdminCookie]);

      expect(res.status).toBe(404);

      const patientA2 = await Patient.findById(patientA2Id);
      expect(patientA2?.isActive).toBe(true);
    });
  });

  // ==========================================
  // Section 3: Tenant Isolation across DASHBOARD COUNTS
  // ==========================================
  describe("Dashboard Counts Tenant Isolation", () => {
    it("GET /api/v1/dashboard/stats: Lab A stats count only Lab A records", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      // totalPatients must be 2 (Lab A patients only, never 4)
      expect(data.cards.totalPatients).toBe(2);
      expect(data.cards.patientsToday).toBe(2);

      // recentPatients must only contain Lab A patients
      expect(data.recentPatients).toHaveLength(2);
      const recentNames = data.recentPatients.map((p: { name: string }) => p.name);
      expect(recentNames).toContain("Albert Alpha");
      expect(recentNames).toContain("Abigail Alpha");
      expect(recentNames).not.toContain("Brandon Beta");
      expect(recentNames).not.toContain("Brenda Beta");

      // registrationsLast7Days should sum to Lab A patients count
      const weeklySum = data.charts.registrationsLast7Days.reduce(
        (acc: number, curr: { count: number }) => acc + curr.count,
        0
      );
      expect(weeklySum).toBe(2);
    });

    it("GET /api/v1/dashboard/stats: Lab B stats count only Lab B records", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [labBAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      // totalPatients must be 2 (Lab B patients only)
      expect(data.cards.totalPatients).toBe(2);
      expect(data.cards.patientsToday).toBe(2);

      expect(data.recentPatients).toHaveLength(2);
      const recentNames = data.recentPatients.map((p: { name: string }) => p.name);
      expect(recentNames).toContain("Brandon Beta");
      expect(recentNames).toContain("Brenda Beta");
      expect(recentNames).not.toContain("Albert Alpha");
      expect(recentNames).not.toContain("Abigail Alpha");

      const weeklySum = data.charts.registrationsLast7Days.reduce(
        (acc: number, curr: { count: number }) => acc + curr.count,
        0
      );
      expect(weeklySum).toBe(2);
    });

    it("GET /api/v1/dashboard/stats: Super Admin sees global system aggregate counts", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      // Super Admin sees global metrics
      expect(data.cards.totalLabs).toBe(2);
      expect(data.cards.activeLabs).toBe(2);
      expect(data.cards.totalUsers).toBe(7); // 1 super admin + 3 in A + 3 in B
    });
  });
});
