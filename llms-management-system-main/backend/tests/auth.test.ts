import bcrypt from "bcryptjs";
import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ROLES } from "../src/constants/roles.js";
import { RefreshToken } from "../src/modules/auth/refreshToken.model.js";
import { Tenant, TENANT_STATUS } from "../src/modules/tenants/tenant.model.js";
import { User } from "../src/modules/users/user.model.js";
import { COOKIE_NAMES } from "../src/utils/cookies.js";

function extractCookie(res: request.Response, cookieName: string): string | undefined {
  const setCookies = res.headers["set-cookie"] as string[] | undefined;
  if (!setCookies) return undefined;

  for (const cookieStr of setCookies) {
    if (cookieStr.startsWith(`${cookieName}=`)) {
      const parts = cookieStr.split(";")[0];
      return parts.slice(cookieName.length + 1);
    }
  }
  return undefined;
}

describe("Auth Module Integration Tests (Supertest)", () => {
  let mongod: MongoMemoryServer;
  let app: Express;

  const rawPassword = "SecurePassword123!";
  let activeTenantId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    app = createApp();

    // 1. Create active tenant
    const tenant = await Tenant.create({
      name: "Metropolis Lab",
      slug: "metropolis-lab",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "contact@metropolis.test",
    });
    activeTenantId = tenant._id.toString();

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 2. Seed active lab admin
    await User.create({
      name: "Admin User",
      email: "admin@metropolis.test",
      passwordHash,
      role: ROLES.LAB_ADMIN,
      tenantId: tenant._id,
      isActive: true,
    });

    // 3. Seed inactive user
    await User.create({
      name: "Inactive User",
      email: "inactive@metropolis.test",
      passwordHash,
      role: ROLES.DOCTOR,
      tenantId: tenant._id,
      isActive: false,
    });

    // 4. Seed user for refresh token test
    await User.create({
      name: "Refresh User",
      email: "refresh@metropolis.test",
      passwordHash,
      role: ROLES.RECEPTIONIST,
      tenantId: tenant._id,
      isActive: true,
    });

    // 5. Seed user for logout test
    await User.create({
      name: "Logout User",
      email: "logout@metropolis.test",
      passwordHash,
      role: ROLES.DOCTOR,
      tenantId: tenant._id,
      isActive: true,
    });

    // 6. Seed user for reuse detection test
    await User.create({
      name: "Reuse User",
      email: "reuse@metropolis.test",
      passwordHash,
      role: ROLES.RECEPTIONIST,
      tenantId: tenant._id,
      isActive: true,
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  it("login success sets 3 cookies and returns 200 with user payload", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin@metropolis.test",
        password: rawPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe("admin@metropolis.test");
    expect(res.body.data.user.role).toBe(ROLES.LAB_ADMIN);
    expect(res.body.data.user.tenantId).toBe(activeTenantId);
    expect(res.body.data.user.tenantName).toBe("Metropolis Lab");
    expect(res.body.data.user.passwordHash).toBeUndefined();

    // Verify all 3 cookies are set
    const accessCookie = extractCookie(res, COOKIE_NAMES.ACCESS_TOKEN);
    const refreshCookie = extractCookie(res, COOKIE_NAMES.REFRESH_TOKEN);
    const sessionCookie = extractCookie(res, COOKIE_NAMES.SESSION_HINT);

    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    expect(sessionCookie).toBe("1");

    const rawCookies = res.headers["set-cookie"] as string[];
    // lms_access must be HttpOnly
    expect(rawCookies.some((c) => c.includes(`${COOKIE_NAMES.ACCESS_TOKEN}=`) && c.includes("HttpOnly"))).toBe(true);
    // lms_refresh must be HttpOnly and restricted to /api/v1/auth
    expect(rawCookies.some((c) => c.includes(`${COOKIE_NAMES.REFRESH_TOKEN}=`) && c.includes("HttpOnly") && c.includes("Path=/api/v1/auth"))).toBe(true);
  });

  it("wrong password returns 401 with generic invalid credentials message", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin@metropolis.test",
        password: "IncorrectPassword!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("inactive user returns 403", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "inactive@metropolis.test",
        password: rawPassword,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("inactive");
  });

  it("refresh performs token rotation and issues a new token pair", async () => {
    // 1. Initial login to obtain refresh token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "refresh@metropolis.test",
        password: rawPassword,
      });

    const initialRefreshToken = extractCookie(loginRes, COOKIE_NAMES.REFRESH_TOKEN);
    expect(initialRefreshToken).toBeDefined();

    // 2. Call /refresh with the cookie
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`${COOKIE_NAMES.REFRESH_TOKEN}=${initialRefreshToken}`]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.user.email).toBe("refresh@metropolis.test");

    const rotatedRefreshToken = extractCookie(refreshRes, COOKIE_NAMES.REFRESH_TOKEN);
    const rotatedAccessToken = extractCookie(refreshRes, COOKIE_NAMES.ACCESS_TOKEN);

    expect(rotatedRefreshToken).toBeDefined();
    expect(rotatedAccessToken).toBeDefined();
    // Tokens must be rotated (new value)
    expect(rotatedRefreshToken).not.toBe(initialRefreshToken);
  });

  it("reuse of an old refresh token is rejected and invalidates all user sessions", async () => {
    // 1. Login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "reuse@metropolis.test",
        password: rawPassword,
      });

    const firstRefreshToken = extractCookie(loginRes, COOKIE_NAMES.REFRESH_TOKEN)!;

    // 2. Rotate once
    const firstRefreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`${COOKIE_NAMES.REFRESH_TOKEN}=${firstRefreshToken}`]);

    expect(firstRefreshRes.status).toBe(200);

    // 3. Attempt reuse of the first (now revoked) refresh token
    const reuseRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`${COOKIE_NAMES.REFRESH_TOKEN}=${firstRefreshToken}`]);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.success).toBe(false);
    expect(reuseRes.body.message).toContain("token reuse detected");

    // 4. Verify all active refresh tokens for this user are now revoked
    const activeTokens = await RefreshToken.find({
      userId: new mongoose.Types.ObjectId(loginRes.body.data.user.id),
      revokedAt: null,
    });
    expect(activeTokens).toHaveLength(0);
  });

  it("logout clears all authentication cookies and revokes token", async () => {
    // 1. Login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "logout@metropolis.test",
        password: rawPassword,
      });

    const refreshToken = extractCookie(loginRes, COOKIE_NAMES.REFRESH_TOKEN);

    // 2. Call /logout
    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [`${COOKIE_NAMES.REFRESH_TOKEN}=${refreshToken}`]);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // 3. Assert cookies are cleared
    const rawCookies = logoutRes.headers["set-cookie"] as string[];
    expect(rawCookies.some((c) => c.includes(`${COOKIE_NAMES.ACCESS_TOKEN}=;`))).toBe(true);
    expect(rawCookies.some((c) => c.includes(`${COOKIE_NAMES.REFRESH_TOKEN}=;`))).toBe(true);
    expect(rawCookies.some((c) => c.includes(`${COOKIE_NAMES.SESSION_HINT}=;`))).toBe(true);
  });

  it("/me works with the access cookie and fails without it", async () => {
    // 1. Request without cookie returns 401
    const unauthRes = await request(app).get("/api/v1/auth/me");
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);

    // 2. Request with valid access cookie returns 200 and user data
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin@metropolis.test",
        password: rawPassword,
      });

    const accessCookie = extractCookie(loginRes, COOKIE_NAMES.ACCESS_TOKEN);

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${accessCookie}`]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe("admin@metropolis.test");
    expect(meRes.body.data.user.tenantName).toBe("Metropolis Lab");
  });
});
