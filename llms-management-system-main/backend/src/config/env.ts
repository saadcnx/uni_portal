import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, { message: "MONGODB_URI is required" }),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { message: "JWT_ACCESS_SECRET must be at least 32 characters" }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: "JWT_REFRESH_SECRET must be at least 32 characters" }),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(16).default(12),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_DOMAIN: z.string().optional().default(""),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SENTRY_DSN: z.string().optional().default(""),
  SEED_SUPER_ADMIN_EMAIL: z
    .string()
    .email({ message: "Invalid email for SEED_SUPER_ADMIN_EMAIL" }),
  SEED_SUPER_ADMIN_PASSWORD: z
    .string()
    .min(8, { message: "SEED_SUPER_ADMIN_PASSWORD must be at least 8 characters" }),
});

export type Env = z.infer<typeof envSchema>;

export function formatEnvErrors(issues: z.ZodIssue[]): string {
  const lines = issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  return `❌ Environment validation failed:\n${lines.join("\n")}`;
}

export function validateEnv(rawEnv: Record<string, unknown> = process.env): Env {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const errorMsg = formatEnvErrors(parsed.error.issues);
    console.error(errorMsg);
    if (rawEnv.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }
  return Object.freeze(parsed.data);
}

export const env: Env = validateEnv();
