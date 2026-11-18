import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "lms_access",
  REFRESH_TOKEN: "lms_refresh",
  SESSION_HINT: "lms_session",
} as const;

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes in ms
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function getBaseCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";
  const options: CookieOptions = {
    sameSite: "lax",
    secure: isProd,
    path: "/",
  };

  if (env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.trim() !== "") {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void {
  const base = getBaseCookieOptions();

  // lms_access: httpOnly, 15 minutes, root path
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
    ...base,
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  // lms_refresh: httpOnly, 7 days, restricted path /api/v1/auth
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/v1/auth",
  });

  // lms_session: NOT httpOnly (client route-guard hint), value "1", 7 days
  res.cookie(COOKIE_NAMES.SESSION_HINT, "1", {
    ...base,
    httpOnly: false,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  const base = getBaseCookieOptions();

  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
    ...base,
    httpOnly: true,
  });

  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    ...base,
    httpOnly: true,
    path: "/api/v1/auth",
  });

  res.clearCookie(COOKIE_NAMES.SESSION_HINT, {
    ...base,
    httpOnly: false,
  });
}
