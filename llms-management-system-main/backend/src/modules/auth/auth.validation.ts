import { z } from "zod";

/**
 * Validation schema for user login.
 * Trims and lowercases the email address.
 */
export const loginSchema = {
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address"),
    password: z
      .string()
      .min(1, "Password is required"),
  }),
};

export type LoginInput = z.infer<typeof loginSchema.body>;
