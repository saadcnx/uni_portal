import type { NextFunction, Request, Response } from "express";

/**
 * Recursively strips keys that start with '$' or contain '.' from objects and arrays.
 * Protects against NoSQL operator injection attacks (e.g. { "$ne": null }).
 */
export function sanitizeObject<T>(input: T): T {
  if (input === null || typeof input !== "object") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as unknown as T;
  }

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    // Filter out Mongo operators ($gt, $ne, etc.) and dot-delimited injection keys
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }

    clean[key] = sanitizeObject(value);
  }

  return clean as T;
}

/**
 * Express middleware to sanitize req.body and req.params.
 * Express 5 note: req.query is read-only so it must not be reassigned here.
 */
export function sanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
}
