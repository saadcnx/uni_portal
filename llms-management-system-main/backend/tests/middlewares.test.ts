import type {} from "../src/types/express.d.ts";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, type Mock, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { notFound } from "../src/middlewares/notFound.js";
import { requestId } from "../src/middlewares/requestId.js";
import { sanitize, sanitizeObject } from "../src/middlewares/sanitize.js";
import { validate } from "../src/middlewares/validate.js";
import { ApiError } from "../src/utils/ApiError.js";

describe("sanitizeObject and sanitize middleware", () => {
  it("strips keys starting with $ (Mongo operators)", () => {
    const malicious = {
      email: { $ne: null },
      password: "secretPassword",
      nested: {
        $gt: 0,
        age: 25,
      },
    };

    const clean = sanitizeObject(malicious);

    expect(clean).toEqual({
      email: {},
      password: "secretPassword",
      nested: {
        age: 25,
      },
    });
    expect((clean.email as Record<string, unknown>).$ne).toBeUndefined();
    expect((clean.nested as Record<string, unknown>).$gt).toBeUndefined();
  });

  it("strips keys containing dots (property injection)", () => {
    const input = {
      "user.role": "SUPER_ADMIN",
      name: "John Doe",
    };

    const clean = sanitizeObject(input);
    expect(clean).toEqual({
      name: "John Doe",
    });
    expect((clean as Record<string, unknown>)["user.role"]).toBeUndefined();
  });

  it("handles arrays and non-object primitives safely", () => {
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject("string")).toBe("string");
    expect(sanitizeObject(123)).toBe(123);

    const arrayInput = [
      { $where: "sleep(1000)", safe: "value1" },
      { "admin.access": true, safe: "value2" },
    ];

    const cleanArray = sanitizeObject(arrayInput);
    expect(cleanArray).toEqual([
      { safe: "value1" },
      { safe: "value2" },
    ]);
  });

  it("middleware sanitizes req.body and req.params without touching req.query", () => {
    const req = {
      body: { $gt: 5, valid: "data" },
      params: { "id.test": "123", id: "456" },
      query: { $ne: null }, // Read-only query should not be reassigned in Express 5
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    sanitize(req, res, next);

    expect(req.body).toEqual({ valid: "data" });
    expect(req.params).toEqual({ id: "456" });
    expect(req.query).toEqual({ $ne: null }); // Query untouched
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("requestId middleware", () => {
  it("generates a new UUID when X-Request-Id header is missing", () => {
    const req = { headers: {} } as unknown as Request;
    const setHeader = vi.fn();
    const res = { setHeader } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("reuses existing X-Request-Id header if provided", () => {
    const req = { headers: { "x-request-id": "client-req-999" } } as unknown as Request;
    const setHeader = vi.fn();
    const res = { setHeader } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(req.id).toBe("client-req-999");
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", "client-req-999");
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("validate middleware", () => {
  const schema = {
    body: z.object({
      email: z.string().email(),
      age: z.coerce.number().min(18),
    }),
    query: z.object({
      search: z.string().optional(),
    }),
    params: z.object({
      id: z.string(),
    }),
  };

  it("stores parsed and coerced data in req.validated on valid input", async () => {
    const req = {
      body: { email: "user@test.com", age: "25" },
      query: { search: "test" },
      params: { id: "123" },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    await validate(schema)(req, res, next);

    expect(req.validated).toEqual({
      body: { email: "user@test.com", age: 25 },
      query: { search: "test" },
      params: { id: "123" },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("passes ApiError.badRequest with field errors to next when validation fails", async () => {
    const req = {
      body: { email: "invalid-email", age: "15" },
      query: {},
      params: { id: "123" },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const passedError = (next as unknown as Mock).mock.calls[0][0] as ApiError;
    expect(passedError.statusCode).toBe(400);
    expect(passedError.message).toBe("Validation failed");
    expect(passedError.errors).toHaveLength(2);
    expect(passedError.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "age" }),
      ])
    );
  });
});

describe("notFound middleware", () => {
  it("calls next with 404 ApiError", () => {
    const req = { method: "GET", originalUrl: "/api/v1/unknown" } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    notFound(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = (next as unknown as Mock).mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("Route GET /api/v1/unknown not found");
  });
});

describe("errorHandler mappings", () => {
  function createMockRes() {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    return {
      status,
      json,
      res: { status } as unknown as Response,
    };
  }

  it("maps ApiError correctly with statusCode and field errors", () => {
    const { status, json, res } = createMockRes();
    const req = { id: "req-123", method: "POST", originalUrl: "/api/test" } as unknown as Request;
    const err = ApiError.badRequest("Invalid request data", [
      { field: "username", message: "Username is taken" },
    ]);

    errorHandler(err, req, res, vi.fn() as unknown as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid request data",
      requestId: "req-123",
      errors: [{ field: "username", message: "Username is taken" }],
    });
  });

  it("maps ZodError to 400 with formatted field errors", () => {
    const { status, json, res } = createMockRes();
    const req = { id: "req-456", method: "POST", originalUrl: "/api/test" } as unknown as Request;

    const schema = z.object({ phone: z.string().min(10) });
    const parseResult = schema.safeParse({ phone: "123" });
    if (parseResult.success) throw new Error("Expected parse failure");

    errorHandler(parseResult.error, req, res, vi.fn() as unknown as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Validation failed",
        requestId: "req-456",
        errors: [expect.objectContaining({ field: "phone" })],
      })
    );
  });

  it("maps Mongoose ValidationError to 400", () => {
    const { status, json, res } = createMockRes();
    const req = { id: "req-789", method: "POST", originalUrl: "/api/test" } as unknown as Request;

    const mongoValError = {
      name: "ValidationError",
      errors: {
        gender: { path: "gender", message: "Invalid gender choice" },
      },
    };

    errorHandler(mongoValError, req, res, vi.fn() as unknown as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Validation failed",
        requestId: "req-789",
        errors: [{ field: "gender", message: "Invalid gender choice" }],
      })
    );
  });

  it("maps Mongoose CastError to 400", () => {
    const { status, json, res } = createMockRes();
    const req = { id: "req-cast", method: "GET", originalUrl: "/api/test" } as unknown as Request;

    const castErr = {
      name: "CastError",
      path: "_id",
      value: "invalid-id",
    };

    errorHandler(castErr, req, res, vi.fn() as unknown as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid value for _id",
        requestId: "req-cast",
      })
    );
  });

  it("maps MongoDB duplicate key error (code 11000) to 409", () => {
    const { status, json, res } = createMockRes();
    const req = { id: "req-dup", method: "POST", originalUrl: "/api/users" } as unknown as Request;

    const dupErr = {
      code: 11000,
      keyValue: { email: "admin@lms.local" },
    };

    errorHandler(dupErr, req, res, vi.fn() as unknown as NextFunction);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "A record with this email already exists",
        requestId: "req-dup",
        errors: [{ field: "email", message: "A record with this email already exists" }],
      })
    );
  });

  it("maps generic unhandled errors to 500", () => {
    const { status, json, res } = createMockRes();
    const req = { id: "req-500", method: "GET", originalUrl: "/api/crash" } as unknown as Request;

    const genericErr = new Error("Database crashed unexpectedly");

    errorHandler(genericErr, req, res, vi.fn() as unknown as NextFunction);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        requestId: "req-500",
      })
    );
  });
});
