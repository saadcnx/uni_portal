import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/config/env.js";

describe("Environment Validation", () => {
  it("fails with a clear error message when required variables are missing", () => {
    expect(() => {
      validateEnv({
        NODE_ENV: "test",
      });
    }).toThrowError(/Environment validation failed/);
  });

  it("identifies specific missing required fields", () => {
    try {
      validateEnv({
        NODE_ENV: "test",
      });
      expect.unreachable("Should have thrown error");
    } catch (err: unknown) {
      const message = (err as Error).message;
      expect(message).toContain("MONGODB_URI");
      expect(message).toContain("JWT_ACCESS_SECRET");
      expect(message).toContain("JWT_REFRESH_SECRET");
      expect(message).toContain("SEED_SUPER_ADMIN_EMAIL");
      expect(message).toContain("SEED_SUPER_ADMIN_PASSWORD");
    }
  });

  it("validates empty string constraints", () => {
    try {
      validateEnv({
        NODE_ENV: "test",
        MONGODB_URI: "",
        JWT_ACCESS_SECRET: "12345678901234567890123456789012",
        JWT_REFRESH_SECRET: "12345678901234567890123456789012",
        SEED_SUPER_ADMIN_EMAIL: "admin@test.com",
        SEED_SUPER_ADMIN_PASSWORD: "Password123!",
      });
      expect.unreachable("Should have thrown error");
    } catch (err: unknown) {
      const message = (err as Error).message;
      expect(message).toContain("MONGODB_URI: MONGODB_URI is required");
    }
  });

  it("validates secret length constraints", () => {
    try {
      validateEnv({
        NODE_ENV: "test",
        MONGODB_URI: "mongodb://localhost:27017/lms",
        JWT_ACCESS_SECRET: "too-short",
        JWT_REFRESH_SECRET: "also-too-short",
        SEED_SUPER_ADMIN_EMAIL: "admin@test.com",
        SEED_SUPER_ADMIN_PASSWORD: "short",
      });
      expect.unreachable("Should have thrown error");
    } catch (err: unknown) {
      const message = (err as Error).message;
      expect(message).toContain("JWT_ACCESS_SECRET must be at least 32 characters");
      expect(message).toContain("JWT_REFRESH_SECRET must be at least 32 characters");
      expect(message).toContain("SEED_SUPER_ADMIN_PASSWORD must be at least 8 characters");
    }
  });

  it("passes when all required variables are valid", () => {
    const validEnv = validateEnv({
      NODE_ENV: "test",
      PORT: "5000",
      MONGODB_URI: "mongodb://localhost:27017/lms",
      JWT_ACCESS_SECRET: "12345678901234567890123456789012",
      JWT_REFRESH_SECRET: "12345678901234567890123456789012",
      SEED_SUPER_ADMIN_EMAIL: "admin@test.com",
      SEED_SUPER_ADMIN_PASSWORD: "Password123!",
    });

    expect(validEnv.PORT).toBe(5000);
    expect(validEnv.BCRYPT_ROUNDS).toBe(12);
    expect(Object.isFrozen(validEnv)).toBe(true);
  });
});
