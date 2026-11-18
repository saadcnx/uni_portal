import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import type request from "supertest";
import { Role, ROLES } from "../../src/constants/roles.js";
import { Counter } from "../../src/modules/patients/counter.model.js";
import { GENDERS, type IPatient, Patient } from "../../src/modules/patients/patient.model.js";
import { type ITenant, Tenant, TENANT_STATUS } from "../../src/modules/tenants/tenant.model.js";
import { type IUser, User } from "../../src/modules/users/user.model.js";
import { COOKIE_NAMES } from "../../src/utils/cookies.js";
import { signAccessToken } from "../../src/utils/tokens.js";

export interface TestDatabase {
  mongod: MongoMemoryServer;
  uri: string;
  clear: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Boots an in-memory MongoDB server and establishes a Mongoose connection.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  return {
    mongod,
    uri,
    clear: async () => {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        if (Object.prototype.hasOwnProperty.call(collections, key)) {
          await collections[key]?.deleteMany({});
        }
      }
    },
    stop: async () => {
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
}

/**
 * Creates a test tenant with realistic defaults.
 */
export async function createTestTenant(overrides: Partial<ITenant> = {}) {
  const randomSlug = `lab-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return Tenant.create({
    name: overrides.name || `Laboratory ${randomSlug}`,
    slug: overrides.slug || randomSlug,
    status: overrides.status || TENANT_STATUS.ACTIVE,
    contactEmail: overrides.contactEmail || `${randomSlug}@lab.test`,
    contactPhone: overrides.contactPhone || "+1-555-0100",
    ...overrides,
  });
}

/**
 * Creates a test user with a hashed password.
 */
export async function createTestUser(
  overrides: Partial<IUser> & {
    plainPassword?: string;
    tenantId?: mongoose.Types.ObjectId | string | null;
  } = {}
) {
  const randomId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash =
    overrides.passwordHash || (await bcrypt.hash(overrides.plainPassword || "Password123!", 10));

  return User.create({
    name: overrides.name || `User ${randomId}`,
    email: overrides.email || `user-${randomId}@lab.test`,
    passwordHash,
    role: overrides.role || ROLES.DOCTOR,
    tenantId: overrides.tenantId === undefined ? null : overrides.tenantId,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    ...overrides,
  });
}

/**
 * Creates a test patient document directly in MongoDB.
 */
export async function createTestPatient(
  overrides: Partial<IPatient> & {
    tenantId: mongoose.Types.ObjectId | string;
  }
) {
  const randomSeq = Math.floor(1000 + Math.random() * 9000);
  return Patient.create({
    patientCode: overrides.patientCode || `PT-${randomSeq}`,
    name: overrides.name || `Patient ${randomSeq}`,
    phone: overrides.phone || `+1555${randomSeq}`,
    gender: overrides.gender || GENDERS.FEMALE,
    dateOfBirth: overrides.dateOfBirth || new Date("1995-05-15"),
    address: overrides.address || "123 Diagnostic Ave",
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    ...overrides,
  });
}

/**
 * Seeds a counter record for a tenant so atomic sequence generation starts at a known number.
 */
export async function initCounter(tenantId: mongoose.Types.ObjectId | string, seq: number = 0) {
  return Counter.findOneAndUpdate(
    { tenantId: new mongoose.Types.ObjectId(tenantId.toString()), key: "patientCode" },
    { $setOnInsert: { seq } },
    { upsert: true, new: true }
  );
}

/**
 * Helper to generate a signed JWT access token in the expected cookie format.
 */
export function createAuthCookie(user: {
  _id?: mongoose.Types.ObjectId | string;
  id?: string;
  role: Role;
  tenantId?: mongoose.Types.ObjectId | string | null;
  isSuperAdmin?: boolean;
}): string {
  const id = user.id || user._id?.toString() || new mongoose.Types.ObjectId().toString();
  const isSuperAdmin =
    user.isSuperAdmin !== undefined ? user.isSuperAdmin : user.role === ROLES.SUPER_ADMIN;
  const tenantId = isSuperAdmin
    ? null
    : user.tenantId
      ? user.tenantId.toString()
      : new mongoose.Types.ObjectId().toString();

  const token = signAccessToken({
    id,
    role: user.role,
    tenantId,
    isSuperAdmin,
  });

  return `${COOKIE_NAMES.ACCESS_TOKEN}=${token}`;
}

/**
 * Extracts a cookie value from a Supertest response's set-cookie headers.
 */
export function extractCookie(res: request.Response, cookieName: string): string | undefined {
  const setCookies = res.headers["set-cookie"] as string[] | undefined;
  if (!setCookies) return undefined;

  for (const cookieStr of setCookies) {
    if (cookieStr.startsWith(`${cookieName}=`)) {
      const parts = cookieStr.split(";")[0];
      return parts?.slice(cookieName.length + 1);
    }
  }
  return undefined;
}
