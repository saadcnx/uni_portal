import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ROLES, type Role } from "../../constants/roles.js";
import { Tenant, TENANT_STATUS } from "../tenants/tenant.model.js";
import { User } from "../users/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { REFRESH_COOKIE_MAX_AGE } from "../../utils/cookies.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
} from "../../utils/tokens.js";
import { RefreshToken } from "./refreshToken.model.js";
import type { LoginInput } from "./auth.validation.js";

export interface CurrentUserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  tenantName: string | null;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: CurrentUserResponse;
  tokens: AuthTokens;
}

const GENERIC_AUTH_ERROR = "Invalid email or password";

/**
 * Service handling authentication operations: login, token rotation, logout, and profile loading.
 * Completely decoupled from HTTP request/response objects for clean unit and integration testing.
 */
export class AuthService {
  /**
   * Authenticates user via email and password.
   * Enforces lowercase email, generic error messages, active status check for user and lab tenant,
   * updates lastLoginAt, generates access token and hashed refresh token.
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Load user explicitly selecting passwordHash (which has select: false by default)
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!user) {
      throw ApiError.unauthorized(GENERIC_AUTH_ERROR);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized(GENERIC_AUTH_ERROR);
    }

    // 403 for deactivated user
    if (!user.isActive) {
      throw ApiError.forbidden("User account is inactive");
    }

    let tenantName: string | null = null;
    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

    // 403 for deactivated lab tenant
    if (!isSuperAdmin) {
      if (!user.tenantId) {
        throw ApiError.forbidden("User is not associated with an active laboratory");
      }

      const tenant = await Tenant.findById(user.tenantId).lean();
      if (!tenant || tenant.status !== TENANT_STATUS.ACTIVE) {
        throw ApiError.forbidden("Laboratory is inactive");
      }

      tenantName = tenant.name;
    }

    // Update lastLoginAt timestamp
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const tenantIdStr = user.tenantId ? user.tenantId.toString() : null;

    // Issue access token (15m)
    const accessToken = signAccessToken({
      id: user._id.toString(),
      role: user.role,
      tenantId: tenantIdStr,
      isSuperAdmin,
    });

    // Issue and persist hashed refresh token (7d)
    const rawRefreshToken = signRefreshToken({
      userId: user._id.toString(),
      tokenId: crypto.randomUUID(),
    });
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenantIdStr,
        tenantName,
        isActive: user.isActive,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
      },
    };
  }

  /**
   * Refreshes access and refresh tokens.
   * Performs reuse detection: if a revoked token is presented, all sessions for that user are invalidated.
   * On valid refresh, revokes the current token and issues a new pair (rotation).
   */
  static async refresh(rawRefreshToken?: string): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw ApiError.unauthorized("Refresh token is required");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await RefreshToken.findOne({ tokenHash });

    if (!existingToken) {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    // Reuse detection: if an already-revoked token is submitted, invalidate all tokens for this user
    if (existingToken.revokedAt) {
      await RefreshToken.updateMany(
        { userId: existingToken.userId, revokedAt: null },
        { revokedAt: new Date() }
      );
      throw ApiError.unauthorized(
        "Invalid refresh token: token reuse detected. All sessions invalidated."
      );
    }

    // Check expiration
    if (existingToken.expiresAt.getTime() < Date.now()) {
      throw ApiError.unauthorized("Refresh token has expired");
    }

    const user = await User.findById(existingToken.userId).lean();
    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("User account is inactive");
    }

    let tenantName: string | null = null;
    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

    if (!isSuperAdmin) {
      if (!user.tenantId) {
        throw ApiError.forbidden("User is not associated with an active laboratory");
      }

      const tenant = await Tenant.findById(user.tenantId).lean();
      if (!tenant || tenant.status !== TENANT_STATUS.ACTIVE) {
        throw ApiError.forbidden("Laboratory is inactive");
      }

      tenantName = tenant.name;
    }

    const tenantIdStr = user.tenantId ? user.tenantId.toString() : null;

    // Issue rotated token pair
    const newRefreshToken = signRefreshToken({
      userId: user._id.toString(),
      tokenId: crypto.randomUUID(),
    });
    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);

    // Revoke old refresh token and link replacement
    existingToken.revokedAt = new Date();
    existingToken.replacedBy = newTokenHash;
    await existingToken.save();

    // Store new hashed refresh token
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });

    const accessToken = signAccessToken({
      id: user._id.toString(),
      role: user.role,
      tenantId: tenantIdStr,
      isSuperAdmin,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenantIdStr,
        tenantName,
        isActive: user.isActive,
      },
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  /**
   * Logs out user by revoking the submitted refresh token in the database.
   */
  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = hashToken(rawRefreshToken);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  /**
   * Loads current authenticated user details and active tenant name.
   */
  static async getMe(userId: string): Promise<CurrentUserResponse> {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (!user.isActive) {
      throw ApiError.forbidden("User account is inactive");
    }

    let tenantName: string | null = null;
    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId).lean();
      if (tenant) {
        tenantName = tenant.name;
      }
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tenantName,
      isActive: user.isActive,
    };
  }
}
