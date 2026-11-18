import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RefreshToken } from "../src/modules/auth/refreshToken.model.js";
import { Tenant } from "../src/modules/tenants/tenant.model.js";
import { User } from "../src/modules/users/user.model.js";

interface MongoIndexSpec {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
  expireAfterSeconds?: number;
}

describe("Model Schema & Index Verification", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // Synchronize indexes with the MongoDB test instance
    await Tenant.syncIndexes();
    await User.syncIndexes();
    await RefreshToken.syncIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  describe("Tenant Model", () => {
    it("has a unique index on slug", async () => {
      const indexes = (await Tenant.listIndexes()) as unknown as MongoIndexSpec[];
      const slugIndex = indexes.find((idx) => idx.name === "slug_1");

      expect(slugIndex).toBeDefined();
      expect(slugIndex?.key).toEqual({ slug: 1 });
      expect(slugIndex?.unique).toBe(true);
    });

    it("enforces ACTIVE or INACTIVE enum statuses", () => {
      const statusField = Tenant.schema.path("status");
      expect(statusField).toBeDefined();
      expect(
        (statusField as unknown as { enumValues: string[] }).enumValues
      ).toEqual(["ACTIVE", "INACTIVE"]);
    });
  });

  describe("User Model", () => {
    it("has unique index on email", async () => {
      const indexes = (await User.listIndexes()) as unknown as MongoIndexSpec[];
      const emailIndex = indexes.find((idx) => idx.name === "email_1");

      expect(emailIndex).toBeDefined();
      expect(emailIndex?.key).toEqual({ email: 1 });
      expect(emailIndex?.unique).toBe(true);
    });

    it("has compound indexes for tenant queries", async () => {
      const indexes = (await User.listIndexes()) as unknown as MongoIndexSpec[];

      const tenantRoleIndex = indexes.find((idx) => idx.name === "tenantId_1_role_1");
      expect(tenantRoleIndex).toBeDefined();
      expect(tenantRoleIndex?.key).toEqual({ tenantId: 1, role: 1 });

      const tenantCreatedAtIndex = indexes.find(
        (idx) => idx.name === "tenantId_1_createdAt_-1"
      );
      expect(tenantCreatedAtIndex).toBeDefined();
      expect(tenantCreatedAtIndex?.key).toEqual({ tenantId: 1, createdAt: -1 });

      const tenantIdIndex = indexes.find((idx) => idx.name === "tenantId_1");
      expect(tenantIdIndex).toBeDefined();
      expect(tenantIdIndex?.key).toEqual({ tenantId: 1 });
    });

    it("hides passwordHash by default with select: false", () => {
      const passwordField = User.schema.path("passwordHash");
      expect(passwordField).toBeDefined();
      expect(
        (passwordField as unknown as { options: { select: boolean } }).options.select
      ).toBe(false);
    });

    it("configured tenantPlugin with allowNull: true", () => {
      const tenantIdField = User.schema.path("tenantId");
      expect(tenantIdField).toBeDefined();
      expect(
        (tenantIdField as unknown as { options: { required: boolean } }).options.required
      ).toBe(false);
    });
  });

  describe("RefreshToken Model", () => {
    it("has a TTL index on expiresAt with expireAfterSeconds: 0", async () => {
      const indexes = (await RefreshToken.listIndexes()) as unknown as MongoIndexSpec[];
      const expiresAtIndex = indexes.find((idx) => idx.name === "expiresAt_1");

      expect(expiresAtIndex).toBeDefined();
      expect(expiresAtIndex?.key).toEqual({ expiresAt: 1 });
      expect(expiresAtIndex?.expireAfterSeconds).toBe(0);
    });

    it("has lookup indexes on userId and tokenHash", async () => {
      const indexes = (await RefreshToken.listIndexes()) as unknown as MongoIndexSpec[];

      const userIdIndex = indexes.find((idx) => idx.name === "userId_1");
      expect(userIdIndex).toBeDefined();
      expect(userIdIndex?.key).toEqual({ userId: 1 });

      const tokenHashIndex = indexes.find((idx) => idx.name === "tokenHash_1");
      expect(tokenHashIndex).toBeDefined();
      expect(tokenHashIndex?.key).toEqual({ tokenHash: 1 });
    });
  });
});
