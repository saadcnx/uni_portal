import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Role } from "../constants/roles.js";

export interface AccessTokenPayload {
  id: string;
  role: Role;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId?: string;
}

/**
 * Signs a short-lived access token (default 15 minutes) with user & tenant identity.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Signs a long-lived refresh token (default 7 days).
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verifies and decodes an access token. Throws JsonWebTokenError/TokenExpiredError if invalid.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return decoded as AccessTokenPayload;
}

/**
 * Verifies and decodes a refresh token. Throws JsonWebTokenError/TokenExpiredError if invalid.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  return decoded as RefreshTokenPayload;
}

/**
 * Computes SHA-256 hash of a token for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
