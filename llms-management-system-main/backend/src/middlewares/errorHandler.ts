import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { captureException } from "../config/sentry.js";
import { ApiError, type ApiFieldError } from "../utils/ApiError.js";

interface MongooseErrorLike {
  name: string;
  code?: number;
  path?: string;
  value?: unknown;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { path: string; message: string }>;
}

/**
 * Central error handling middleware.
 * Maps ApiError, ZodError, Mongoose validation/cast/duplicate key errors to standardized JSON responses.
 * Logs issues via Pino, reports 5xx server errors to Sentry, and suppresses stack traces in production.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error handlers by arity 4; _next must be declared
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: ApiFieldError[] | undefined;

  // 1. ApiError (custom operational errors)
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // 2. Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = err.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));
  }
  // 3. Mongoose Validation Error
  else if (
    typeof err === "object" &&
    err !== null &&
    (err as MongooseErrorLike).name === "ValidationError" &&
    (err as MongooseErrorLike).errors
  ) {
    statusCode = 400;
    message = "Validation failed";
    const mongoErrors = (err as MongooseErrorLike).errors || {};
    errors = Object.values(mongoErrors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }
  // 4. Mongoose Cast Error (invalid ObjectId, type conversion)
  else if (
    typeof err === "object" &&
    err !== null &&
    (err as MongooseErrorLike).name === "CastError"
  ) {
    const castErr = err as MongooseErrorLike;
    statusCode = 400;
    message = `Invalid value for ${castErr.path || "field"}`;
    errors = [
      {
        field: castErr.path,
        message: `Invalid ${castErr.path}: ${String(castErr.value)}`,
      },
    ];
  }
  // 5. MongoDB Duplicate Key Error (code 11000)
  else if (
    typeof err === "object" &&
    err !== null &&
    (err as MongooseErrorLike).code === 11000
  ) {
    const dupErr = err as MongooseErrorLike;
    statusCode = 409;
    const duplicateFields = dupErr.keyValue ? Object.keys(dupErr.keyValue) : [];
    const fieldName = duplicateFields[0];
    message = fieldName
      ? `A record with this ${fieldName} already exists`
      : "Duplicate record conflict";
    errors = fieldName ? [{ field: fieldName, message }] : undefined;
  }
  // 6. Generic/Standard Error
  else if (err instanceof Error) {
    message = env.NODE_ENV === "production" ? "Internal server error" : err.message;
  }

  // Observability: Log error & report 5xx to Sentry
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
      },
      message
    );

    captureException(err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
    });
  } else {
    logger.warn(
      {
        requestId: req.id,
        statusCode,
        method: req.method,
        url: req.originalUrl,
        errors,
      },
      message
    );
  }

  const responseBody: Record<string, unknown> = {
    success: false,
    message,
    requestId: req.id,
  };

  if (errors && errors.length > 0) {
    responseBody.errors = errors;
  }

  if (env.NODE_ENV === "development" && statusCode === 500 && err instanceof Error) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
}
