import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ROLES } from "../src/constants/roles.js";
import {
  ACCESS_COOKIE_MAX_AGE,
  clearAuthCookies,
  COOKIE_NAMES,
  REFRESH_COOKIE_MAX_AGE,
  setAuthCookies,
} from "../src/utils/cookies.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../src/utils/tokens.js";

describe("Token Signing, Verification and Hashing", () => {
  const userPayload = {
    id: "user_123",
    role: ROLES.LAB_ADMIN,
    tenantId: "tenant_456",
    isSuperAdmin: false,
  };

  it("signs and verifies an access token", () => {
    const token = signAccessToken(userPayload);
    expect(typeof token).toBe("string");

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(userPayload.id);
    expect(decoded.role).toBe(userPayload.role);
    expect(decoded.tenantId).toBe(userPayload.tenantId);
    expect(decoded.isSuperAdmin).toBe(userPayload.isSuperAdmin);
  });

  it("signs and verifies a refresh token", () => {
    const refreshToken = signRefreshToken({ userId: "user_123", tokenId: "token_abc" });
    expect(typeof refreshToken).toBe("string");

    const decoded = verifyRefreshToken(refreshToken);
    expect(decoded.userId).toBe("user_123");
    expect(decoded.tokenId).toBe("token_abc");
  });

  it("consistently hashes tokens using SHA-256", () => {
    const token = "sample-token-string";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 in hex is 64 characters
  });

  it("fails verification on invalid token", () => {
    expect(() => verifyAccessToken("invalid.token.here")).toThrow();
  });
});

describe("Auth Cookies", () => {
  it("sets lms_access, lms_refresh and lms_session cookies with correct options", () => {
    const mockCookie = vi.fn();
    const res = { cookie: mockCookie } as unknown as Response;

    setAuthCookies(res, {
      accessToken: "access_token_123",
      refreshToken: "refresh_token_456",
    });

    expect(mockCookie).toHaveBeenCalledTimes(3);

    // 1. lms_access (httpOnly, 15m)
    expect(mockCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      "access_token_123",
      expect.objectContaining({
        httpOnly: true,
        maxAge: ACCESS_COOKIE_MAX_AGE,
        sameSite: "lax",
      })
    );

    // 2. lms_refresh (httpOnly, 7d, path /api/v1/auth)
    expect(mockCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      "refresh_token_456",
      expect.objectContaining({
        httpOnly: true,
        maxAge: REFRESH_COOKIE_MAX_AGE,
        path: "/api/v1/auth",
        sameSite: "lax",
      })
    );

    // 3. lms_session (not httpOnly, value 1, 7d)
    expect(mockCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.SESSION_HINT,
      "1",
      expect.objectContaining({
        httpOnly: false,
        maxAge: REFRESH_COOKIE_MAX_AGE,
        sameSite: "lax",
      })
    );
  });

  it("clears all 3 auth cookies on logout", () => {
    const mockClearCookie = vi.fn();
    const res = { clearCookie: mockClearCookie } as unknown as Response;

    clearAuthCookies(res);

    expect(mockClearCookie).toHaveBeenCalledTimes(3);

    expect(mockClearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.ACCESS_TOKEN,
      expect.objectContaining({ httpOnly: true })
    );

    expect(mockClearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.REFRESH_TOKEN,
      expect.objectContaining({ httpOnly: true, path: "/api/v1/auth" })
    );

    expect(mockClearCookie).toHaveBeenCalledWith(
      COOKIE_NAMES.SESSION_HINT,
      expect.objectContaining({ httpOnly: false })
    );
  });
});
