import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError, type ApiFieldError } from "../utils/ApiError.js";

export interface ValidationSchema {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates request params, query, and body against provided Zod schemas.
 * Stores parsed, coerced data in req.validated without mutating read-only Express 5 properties.
 * Returns HTTP 400 with formatted field errors if validation fails.
 */
export function validate(schema: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const allErrors: ApiFieldError[] = [];
      const validated = {
        body: req.body as unknown,
        query: req.query as unknown,
        params: req.params as unknown,
      };

      if (schema.params) {
        const result = await schema.params.safeParseAsync(req.params);
        if (!result.success) {
          allErrors.push(
            ...result.error.issues.map((issue) => ({
              field: issue.path.join(".") || "params",
              message: issue.message,
            }))
          );
        } else {
          validated.params = result.data;
        }
      }

      if (schema.query) {
        const result = await schema.query.safeParseAsync(req.query);
        if (!result.success) {
          allErrors.push(
            ...result.error.issues.map((issue) => ({
              field: issue.path.join(".") || "query",
              message: issue.message,
            }))
          );
        } else {
          validated.query = result.data;
        }
      }

      if (schema.body) {
        const result = await schema.body.safeParseAsync(req.body);
        if (!result.success) {
          allErrors.push(
            ...result.error.issues.map((issue) => ({
              field: issue.path.join(".") || "body",
              message: issue.message,
            }))
          );
        } else {
          validated.body = result.data;
        }
      }

      if (allErrors.length > 0) {
        next(ApiError.badRequest("Validation failed", allErrors));
        return;
      }

      req.validated = validated;
      next();
    } catch (err: unknown) {
      next(err);
    }
  };
}
