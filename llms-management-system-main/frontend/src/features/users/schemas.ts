import { z } from "zod";
import { ROLES } from "@/constants/roles";

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)/;

/**
 * Base Zod validation schema for creating a user account.
 * Strict parity with backend user.validation.ts and API_CONTRACT.md.
 */
export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      PASSWORD_REGEX,
      "Password must contain at least one letter and one number"
    ),
  role: z.enum([
    ROLES.SUPER_ADMIN,
    ROLES.LAB_ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
  ]),
  tenantId: z.string().trim().optional(),
});

/**
 * Zod validation schema for updating an existing user account.
 * Password reset is optional; when supplied, must meet standard complexity rules.
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters"),
  role: z.enum([
    ROLES.SUPER_ADMIN,
    ROLES.LAB_ADMIN,
    ROLES.DOCTOR,
    ROLES.RECEPTIONIST,
  ]),
  isActive: z.boolean(),
  password: z
    .string()
    .optional()
    .or(z.literal(""))
    .superRefine((val, ctx) => {
      if (!val || val.length === 0) return;
      if (val.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters",
        });
      }
      if (!PASSWORD_REGEX.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must contain at least one letter and one number",
        });
      }
    }),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
