import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { ROLES } from "../src/constants/roles.js";
import { getTenantContext } from "../src/context/tenantContext.js";
import { authenticate } from "../src/middlewares/authenticate.js";
import { authorize } from "../src/middlewares/authorize.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { Tenant, TENANT_STATUS } from "../src/modules/tenants/tenant.model.js";
import { User } from "../src/modules/users/user.model.js";
import type {} from "../src/types/express.d.ts";
import { COOKIE_NAMES } from "../src/utils/cookies.js";
import { signAccessToken } from "../src/utils/tokens.js";

describe("Authentication and Authorization Middlewares", () => {
  let mongod: MongoMemoryServer;
  let app: express.Express;

  let activeTenantId: string;
  let inactiveTenantId: string;

  let labAdminUserId: string;
  let doctorUserId: string;
  let inactiveUserId: string;
  let inactiveLabUserId: string;
  let superAdminUserId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // 1. Create active and inactive tenants
    const activeTenant = await Tenant.create({
      name: "Alpha Diagnostics",
      slug: "alpha-diag",
      status: TENANT_STATUS.ACTIVE,
      contactEmail: "admin@alpha.com",
    });
    activeTenantId = activeTenant._id.toString();

    const inactiveTenant = await Tenant.create({
      name: "Suspended Diagnostics",
      slug: "suspended-diag",
      status: TENANT_STATUS.INACTIVE,
      contactEmail: "admin@suspended.com",
    });
    inactiveTenantId = inactiveTenant._id.toString();

    // 2. Create users
    const labAdmin = await User.create({
      name: "Alice Admin",
      email: "alice@alpha.com",
      passwordHash: "secret_hash",
      role: ROLES.LAB_ADMIN,
      tenantId: activeTenant._id,
      isActive: true,
    });
    labAdminUserId = labAdmin._id.toString();

    const doctor = await User.create({
      name: "Dr. Bob",
      email: "bob@alpha.com",
      passwordHash: "secret_hash",
      role: ROLES.DOCTOR,
      tenantId: activeTenant._id,
      isActive: true,
    });
    doctorUserId = doctor._id.toString();

    const inactiveUser = await User.create({
      name: "Inactive Dave",
      email: "dave@alpha.com",
      passwordHash: "secret_hash",
      role: ROLES.LAB_ADMIN,
      tenantId: activeTenant._id,
      isActive: false,
    });
    inactiveUserId = inactiveUser._id.toString();

    const inactiveLabUser = await User.create({
      name: "Eve InactiveLab",
      email: "eve@suspended.com",
      passwordHash: "secret_hash",
      role: ROLES.LAB_ADMIN,
      tenantId: inactiveTenant._id,
      isActive: true,
    });
    inactiveLabUserId = inactiveLabUser._id.toString();

    const superAdmin = await User.create({
      name: "Platform SuperAdmin",
      email: "root@platform.internal",
      passwordHash: "secret_hash",
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isActive: true,
    });
    superAdminUserId = superAdmin._id.toString();

    // 3. Construct test Express application with authenticate and authorize
    app = express();
    app.use(cookieParser());
    app.use(express.json());

    // Protected route requiring patient:delete (LAB_ADMIN only)
    app.delete(
      "/api/test/patients/:id",
      authenticate,
      authorize("patient:delete"),
      (req, res) => {
        const tenantContext = getTenantContext();
        res.status(200).json({
          success: true,
          user: req.user,
          tenantContext,
        });
      }
    );

    // Protected route requiring tenant:manage (SUPER_ADMIN only)
    app.post(
      "/api/test/tenants",
      authenticate,
      authorize("tenant:manage"),
      (req, res) => {
        const tenantContext = getTenantContext();
        res.status(200).json({
          success: true,
          user: req.user,
          tenantContext,
        });
      }
    );

    // Mount centralized error handler
    app.use(errorHandler);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  it("returns 401 when no auth cookie is provided", async () => {
    const res = await request(app).delete("/api/test/patients/123");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Authentication required");
  });

  it("returns 401 when access token is expired", async () => {
    const expiredToken = jwt.sign(
      {
        id: labAdminUserId,
        role: ROLES.LAB_ADMIN,
        tenantId: activeTenantId,
        isSuperAdmin: false,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .delete("/api/test/patients/123")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${expiredToken}`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("invalid or expired token");
  });

  it("returns 403 when authenticated user has the wrong role (insufficient permissions)", async () => {
    // DOCTOR does not have 'patient:delete' permission
    const doctorToken = signAccessToken({
      id: doctorUserId,
      role: ROLES.DOCTOR,
      tenantId: activeTenantId,
      isSuperAdmin: false,
    });

    const res = await request(app)
      .delete("/api/test/patients/123")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${doctorToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("lacks permission 'patient:delete'");
  });

  it("returns 200 when authenticated user has the correct role and active lab", async () => {
    // LAB_ADMIN has 'patient:delete' permission
    const labAdminToken = signAccessToken({
      id: labAdminUserId,
      role: ROLES.LAB_ADMIN,
      tenantId: activeTenantId,
      isSuperAdmin: false,
    });

    const res = await request(app)
      .delete("/api/test/patients/123")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${labAdminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual({
      id: labAdminUserId,
      role: ROLES.LAB_ADMIN,
      tenantId: activeTenantId,
      isSuperAdmin: false,
    });
    expect(res.body.tenantContext).toEqual({
      tenantId: activeTenantId,
      userId: labAdminUserId,
      role: ROLES.LAB_ADMIN,
      isSuperAdmin: false,
    });
  });

  it("returns 403 when authenticated user account is inactive", async () => {
    const inactiveUserToken = signAccessToken({
      id: inactiveUserId,
      role: ROLES.LAB_ADMIN,
      tenantId: activeTenantId,
      isSuperAdmin: false,
    });

    const res = await request(app)
      .delete("/api/test/patients/123")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${inactiveUserToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("user account is deactivated");
  });

  it("returns 403 when laboratory tenant is inactive", async () => {
    const inactiveLabUserToken = signAccessToken({
      id: inactiveLabUserId,
      role: ROLES.LAB_ADMIN,
      tenantId: inactiveTenantId,
      isSuperAdmin: false,
    });

    const res = await request(app)
      .delete("/api/test/patients/123")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${inactiveLabUserToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("laboratory tenant is inactive");
  });

  it("allows SUPER_ADMIN without tenant lab to access platform management", async () => {
    const superAdminToken = signAccessToken({
      id: superAdminUserId,
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isSuperAdmin: true,
    });

    const res = await request(app)
      .post("/api/test/tenants")
      .set("Cookie", [`${COOKIE_NAMES.ACCESS_TOKEN}=${superAdminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual({
      id: superAdminUserId,
      role: ROLES.SUPER_ADMIN,
      tenantId: null,
      isSuperAdmin: true,
    });
    expect(res.body.tenantContext).toEqual({
      tenantId: null,
      userId: superAdminUserId,
      role: ROLES.SUPER_ADMIN,
      isSuperAdmin: true,
    });
  });
});
