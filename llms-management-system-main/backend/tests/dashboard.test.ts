import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ROLES } from "../src/constants/roles.js";
import { GENDERS, Patient } from "../src/modules/patients/patient.model.js";
import { Tenant, TENANT_STATUS } from "../src/modules/tenants/tenant.model.js";
import { User } from "../src/modules/users/user.model.js";
import { COOKIE_NAMES } from "../src/utils/cookies.js";
import { signAccessToken } from "../src/utils/tokens.js";

describe("Dashboard Module Integration Tests (Supertest)", () => {
  let mongod: MongoMemoryServer;
  let app: Express;

  let labATenantId: string;
  let labBTenantId: string;

  let superAdminCookie: string;
  let labAAdminCookie: string;
  let doctorACookie: string;
  let receptionistA1Cookie: string;
  let receptionistA2Cookie: string;

  let labBAdminCookie: string;
  let receptionistBCookie: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    app = createApp();

    // 1. Create two tenants: Lab A (active) and Lab B (active), and an inactive lab for super admin stats
    const tenantA = await Tenant.create({
      name: "Alpha Lab",
      slug: "alpha-lab",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "admin@alpha.test",
    });
    labATenantId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: "Beta Lab",
      slug: "beta-lab",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "admin@beta.test",
    });
    labBTenantId = tenantB._id.toString();

    await Tenant.create({
      name: "Inactive Gamma Lab",
      slug: "gamma-lab",
      status: TENANT_STATUS.INACTIVE,
      contactEmail: "admin@gamma.test",
    });

    // 2. Create Super Admin
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

    // 3. Create Lab A Staff: 1 Admin, 1 Doctor, 2 Receptionists (Total Staff: 4)
    const labAAdmin = await User.create({
      name: "Alice Admin",
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
      name: "Dr. Charlie",
      email: "charlie@alpha.test",
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

    const receptionistA1 = await User.create({
      name: "Pam Receptionist",
      email: "pam@alpha.test",
      passwordHash: "hash123",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantA._id,
      isActive: true,
    });
    const receptionistA1Token = signAccessToken({
      id: receptionistA1._id.toString(),
      role: ROLES.RECEPTIONIST,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    receptionistA1Cookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${receptionistA1Token}`;

    const receptionistA2 = await User.create({
      name: "Erin Receptionist",
      email: "erin@alpha.test",
      passwordHash: "hash123",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantA._id,
      isActive: true,
    });
    const receptionistA2Token = signAccessToken({
      id: receptionistA2._id.toString(),
      role: ROLES.RECEPTIONIST,
      tenantId: labATenantId,
      isSuperAdmin: false,
    });
    receptionistA2Cookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${receptionistA2Token}`;

    // 4. Create Lab B Staff: 1 Admin, 1 Receptionist (Total Staff: 2)
    const labBAdmin = await User.create({
      name: "Bob Admin",
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

    const receptionistB = await User.create({
      name: "Toby Receptionist",
      email: "toby@beta.test",
      passwordHash: "hash123",
      role: ROLES.RECEPTIONIST,
      tenantId: tenantB._id,
      isActive: true,
    });
    const receptionistBToken = signAccessToken({
      id: receptionistB._id.toString(),
      role: ROLES.RECEPTIONIST,
      tenantId: labBTenantId,
      isSuperAdmin: false,
    });
    receptionistBCookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${receptionistBToken}`;

    // 5. Seed Patients in Lab A:
    // - 2 registered today by receptionistA1
    // - 1 registered today by receptionistA2
    // - 1 registered 2 days ago
    // - 1 soft deleted (should NOT be counted)
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await Patient.create([
      {
        tenantId: tenantA._id,
        patientCode: "PT-0001",
        name: "Patient A1 Today",
        phone: "+15550000001",
        gender: GENDERS.MALE,
        dateOfBirth: new Date("1980-01-01"),
        isActive: true,
        createdBy: receptionistA1._id,
        createdAt: now,
      },
      {
        tenantId: tenantA._id,
        patientCode: "PT-0002",
        name: "Patient A2 Today",
        phone: "+15550000002",
        gender: GENDERS.FEMALE,
        dateOfBirth: new Date("1985-02-02"),
        isActive: true,
        createdBy: receptionistA1._id,
        createdAt: now,
      },
      {
        tenantId: tenantA._id,
        patientCode: "PT-0003",
        name: "Patient A3 Today",
        phone: "+15550000003",
        gender: GENDERS.OTHER,
        dateOfBirth: new Date("1990-03-03"),
        isActive: true,
        createdBy: receptionistA2._id,
        createdAt: now,
      },
      {
        tenantId: tenantA._id,
        patientCode: "PT-0004",
        name: "Patient A4 Past",
        phone: "+15550000004",
        gender: GENDERS.FEMALE,
        dateOfBirth: new Date("1995-04-04"),
        isActive: true,
        createdBy: receptionistA1._id,
        createdAt: twoDaysAgo,
      },
      {
        tenantId: tenantA._id,
        patientCode: "PT-0005",
        name: "Patient A5 SoftDeleted",
        phone: "+15550000005",
        gender: GENDERS.MALE,
        dateOfBirth: new Date("2000-05-05"),
        isActive: false, // Soft deleted!
        createdBy: receptionistA1._id,
        createdAt: now,
      },
    ]);

    // 6. Seed Patients in Lab B:
    // - 2 registered today by receptionistB
    // - 3 registered 3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    await Patient.create([
      {
        tenantId: tenantB._id,
        patientCode: "PT-0001",
        name: "Patient B1 Today",
        phone: "+15550000011",
        gender: GENDERS.MALE,
        dateOfBirth: new Date("1982-01-01"),
        isActive: true,
        createdBy: receptionistB._id,
        createdAt: now,
      },
      {
        tenantId: tenantB._id,
        patientCode: "PT-0002",
        name: "Patient B2 Today",
        phone: "+15550000012",
        gender: GENDERS.FEMALE,
        dateOfBirth: new Date("1988-02-02"),
        isActive: true,
        createdBy: receptionistB._id,
        createdAt: now,
      },
      {
        tenantId: tenantB._id,
        patientCode: "PT-0003",
        name: "Patient B3 Past",
        phone: "+15550000013",
        gender: GENDERS.OTHER,
        dateOfBirth: new Date("1991-03-03"),
        isActive: true,
        createdBy: receptionistB._id,
        createdAt: threeDaysAgo,
      },
      {
        tenantId: tenantB._id,
        patientCode: "PT-0004",
        name: "Patient B4 Past",
        phone: "+15550000014",
        gender: GENDERS.MALE,
        dateOfBirth: new Date("1994-04-04"),
        isActive: true,
        createdBy: receptionistB._id,
        createdAt: threeDaysAgo,
      },
      {
        tenantId: tenantB._id,
        patientCode: "PT-0005",
        name: "Patient B5 Past",
        phone: "+15550000015",
        gender: GENDERS.FEMALE,
        dateOfBirth: new Date("1997-05-05"),
        isActive: true,
        createdBy: receptionistB._id,
        createdAt: threeDaysAgo,
      },
    ]);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  // ==========================================
  // 1. ROUTE GUARDS & HEADERS
  // ==========================================
  describe("Route Guards & Headers", () => {
    it("returns 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/dashboard/stats");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("sets Cache-Control header to 'private, max-age=30'", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe("private, max-age=30");
    });
  });

  // ==========================================
  // 2. SUPER ADMIN STATS
  // ==========================================
  describe("SUPER_ADMIN Dashboard Shape", () => {
    it("returns exact Super Admin shape with cards and charts (no recentPatients)", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;

      // Cards: totalLabs, activeLabs, totalUsers
      expect(data.cards).toBeDefined();
      expect(data.cards.totalLabs).toBe(3); // Alpha, Beta, Inactive Gamma
      expect(data.cards.activeLabs).toBe(2); // Alpha, Beta
      expect(data.cards.totalUsers).toBe(7); // SuperAdmin (1) + LabA (4) + LabB (2)

      // Charts: labsByMonth (6 months), usersByRole
      expect(data.charts).toBeDefined();
      expect(Array.isArray(data.charts.labsByMonth)).toBe(true);
      expect(data.charts.labsByMonth).toHaveLength(6);

      // Verify labsByMonth entries format and zero-filling
      for (const item of data.charts.labsByMonth) {
        expect(item.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof item.count).toBe("number");
      }

      // Verify usersByRole entries
      expect(Array.isArray(data.charts.usersByRole)).toBe(true);
      const rolesInChart = data.charts.usersByRole.map(
        (r: { role: string }) => r.role
      );
      expect(rolesInChart).toContain(ROLES.SUPER_ADMIN);
      expect(rolesInChart).toContain(ROLES.LAB_ADMIN);
      expect(rolesInChart).toContain(ROLES.DOCTOR);
      expect(rolesInChart).toContain(ROLES.RECEPTIONIST);

      // Verify no recentPatients table for Super Admin
      expect(data.recentPatients).toBeUndefined();
    });
  });

  // ==========================================
  // 3. LAB ADMIN STATS & TENANT ISOLATION
  // ==========================================
  describe("LAB_ADMIN Dashboard Shape & Tenant Isolation", () => {
    it("returns exact Lab Admin shape with cards, charts, and recentPatients scoped strictly to Lab A", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;

      // Cards: totalPatients, patientsToday, totalStaff
      expect(data.cards).toBeDefined();
      expect(data.cards.totalPatients).toBe(4); // 4 active in Lab A (excludes soft deleted)
      expect(data.cards.patientsToday).toBe(3); // 3 registered today in Lab A
      expect(data.cards.totalStaff).toBe(4); // Alice, Charlie, Pam, Erin

      // Charts: registrationsLast7Days (7 days), genderBreakdown
      expect(data.charts).toBeDefined();
      expect(data.charts.registrationsLast7Days).toHaveLength(7);

      for (const item of data.charts.registrationsLast7Days) {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof item.count).toBe("number");
      }

      expect(Array.isArray(data.charts.genderBreakdown)).toBe(true);
      const genderMap = new Map(
        data.charts.genderBreakdown.map(
          (g: { gender: string; count: number }) => [g.gender, g.count]
        )
      );
      expect(genderMap.get(GENDERS.MALE)).toBe(1); // Patient A1 (active)
      expect(genderMap.get(GENDERS.FEMALE)).toBe(2); // Patient A2, A4
      expect(genderMap.get(GENDERS.OTHER)).toBe(1); // Patient A3

      // Recent patients: up to 5
      expect(Array.isArray(data.recentPatients)).toBe(true);
      expect(data.recentPatients).toHaveLength(4);
      for (const p of data.recentPatients) {
        expect(p.name).toMatch(/^Patient A/); // Only Lab A patients
        expect(p.id).toBeDefined();
        expect(p.patientCode).toBeDefined();
      }
    });

    it("verifies Lab B Admin receives counts and patients strictly isolated to Lab B", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [labBAdminCookie]);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.cards.totalPatients).toBe(5); // 5 patients in Lab B
      expect(data.cards.patientsToday).toBe(2); // 2 registered today in Lab B
      expect(data.cards.totalStaff).toBe(2); // Bob, Toby
      expect(data.recentPatients).toHaveLength(5);
      for (const p of data.recentPatients) {
        expect(p.name).toMatch(/^Patient B/);
      }
    });
  });

  // ==========================================
  // 4. DOCTOR STATS
  // ==========================================
  describe("DOCTOR Dashboard Shape", () => {
    it("returns exact Doctor shape: totalPatients, patientsToday, 7 days, genderBreakdown, recentPatients (no totalStaff)", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [doctorACookie]);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Cards: only totalPatients and patientsToday (NO totalStaff)
      expect(data.cards).toBeDefined();
      expect(data.cards.totalPatients).toBe(4);
      expect(data.cards.patientsToday).toBe(3);
      expect(data.cards.totalStaff).toBeUndefined();

      // Charts: registrationsLast7Days and genderBreakdown
      expect(data.charts.registrationsLast7Days).toHaveLength(7);
      expect(data.charts.genderBreakdown).toBeDefined();

      // Recent patients
      expect(data.recentPatients).toHaveLength(4);
    });
  });

  // ==========================================
  // 5. RECEPTIONIST STATS
  // ==========================================
  describe("RECEPTIONIST Dashboard Shape", () => {
    it("returns exact Receptionist shape: registeredToday (by me), totalPatients, 7 days, recentPatients (no genderBreakdown, no totalStaff)", async () => {
      // Receptionist A1 registered 2 patients today
      const resA1 = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [receptionistA1Cookie]);

      expect(resA1.status).toBe(200);
      const dataA1 = resA1.body.data;

      expect(dataA1.cards.registeredToday).toBe(2); // Only patients created by receptionist A1 today
      expect(dataA1.cards.totalPatients).toBe(4); // Total in Lab A
      expect(dataA1.cards.patientsToday).toBeUndefined();
      expect(dataA1.cards.totalStaff).toBeUndefined();

      // Charts: only registrationsLast7Days (NO genderBreakdown)
      expect(dataA1.charts.registrationsLast7Days).toHaveLength(7);
      expect(dataA1.charts.genderBreakdown).toBeUndefined();

      // Recent patients table
      expect(dataA1.recentPatients).toHaveLength(4);

      // Receptionist A2 registered 1 patient today
      const resA2 = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [receptionistA2Cookie]);

      expect(resA2.status).toBe(200);
      expect(resA2.body.data.cards.registeredToday).toBe(1);

      // Receptionist B in Lab B registered 2 patients today
      const resB = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [receptionistBCookie]);

      expect(resB.status).toBe(200);
      expect(resB.body.data.cards.registeredToday).toBe(2);
      expect(resB.body.data.cards.totalPatients).toBe(5);
    });
  });

  // ==========================================
  // 6. ZERO-FILLED DAYS & MONTHS
  // ==========================================
  describe("Zero-Filled Days and Months", () => {
    it("ensures exactly 7 entries for registrationsLast7Days even with days having 0 registrations", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [labAAdminCookie]);

      expect(res.status).toBe(200);
      const days = res.body.data.charts.registrationsLast7Days;
      expect(days).toHaveLength(7);

      // At least one day in the 7-day span has 0 registrations
      const zeroDay = days.find((d: { count: number }) => d.count === 0);
      expect(zeroDay).toBeDefined();
      expect(zeroDay.count).toBe(0);
    });

    it("ensures exactly 6 entries for labsByMonth even with months having 0 labs", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [superAdminCookie]);

      expect(res.status).toBe(200);
      const months = res.body.data.charts.labsByMonth;
      expect(months).toHaveLength(6);

      // Past months before current test run have 0 labs
      const zeroMonth = months.find((m: { count: number }) => m.count === 0);
      expect(zeroMonth).toBeDefined();
      expect(zeroMonth.count).toBe(0);
    });
  });
});
