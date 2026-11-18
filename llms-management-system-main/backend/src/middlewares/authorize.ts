import type { NextFunction, Request, Response } from "express";
import { type Permission, hasPermission } from "../constants/permissions.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Authorization middleware factory:
 * Asserts req.user has the requested permission mapped in PERMISSIONS.
 * Returns 403 Forbidden with a clear message if permission is not granted.
 */
export function authorize(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(
        ApiError.forbidden(
          `Access denied: role '${req.user.role}' lacks permission '${permission}'`
        )
      );
    }

    next();
  };
}
