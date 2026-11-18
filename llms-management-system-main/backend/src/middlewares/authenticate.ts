import type { NextFunction, Request, Response } from "express";
import { ROLES } from "../constants/roles.js";
import { runWithTenant } from "../context/tenantContext.js";
import { Tenant, TENANT_STATUS } from "../modules/tenants/tenant.model.js";
import { User } from "../modules/users/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { COOKIE_NAMES } from "../utils/cookies.js";
import { type AccessTokenPayload, verifyAccessToken } from "../utils/tokens.js";

/**
 * Authentication middleware:
 * - Reads lms_access cookie
 * - Verifies access token
 * - Loads active user and verifies active status
 * - Checks tenant status for non-superadmin users (rejects inactive labs)
 * - Populates req.user
 * - Executes downstream request handlers inside runWithTenant
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];
    if (!token) {
      throw ApiError.unauthorized("Authentication required: missing access token");
    }

    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized("Authentication failed: invalid or expired token");
    }

    const user = await User.findById(payload.id).lean();
    if (!user) {
      throw ApiError.unauthorized("Authentication failed: user no longer exists");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("Access denied: user account is deactivated");
    }

    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
    let tenantId: string | null = null;

    if (!isSuperAdmin) {
      if (!user.tenantId) {
        throw ApiError.forbidden("Access denied: user is not assigned to any laboratory");
      }

      const tenant = await Tenant.findById(user.tenantId).lean();
      if (!tenant || tenant.status !== TENANT_STATUS.ACTIVE) {
        throw ApiError.forbidden("Access denied: laboratory tenant is inactive");
      }

      tenantId = user.tenantId.toString();
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      tenantId,
      isSuperAdmin,
    };

    runWithTenant(
      {
        tenantId,
        userId: user._id.toString(),
        role: user.role,
        isSuperAdmin,
      },
      () => next()
    );
  } catch (err) {
    next(err);
  }
}
