import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/**
 * 404 handler for routes that do not match any defined endpoint.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
