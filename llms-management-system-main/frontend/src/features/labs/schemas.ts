import { z } from "zod";

/**
 * Zod validation schema for the primary Lab Admin account created alongside a new lab tenant.
 */
export const labAdminSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Admin name must be at least 2 characters")
    .max(80, "Admin name cannot exceed 80 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

/**
 * Zod validation schema for creating a new laboratory tenant.
 * Matches API_CONTRACT.md and backend createTenantSchema.
 */
export const createLabSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Lab name must be at least 2 characters")
    .max(100, "Lab name cannot exceed 100 characters"),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid contact email address"),
  contactPhone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  admin: labAdminSchema,
});

/**
 * Zod validation schema for updating an existing laboratory tenant.
 * Matches API_CONTRACT.md and backend updateTenantSchema.
 */
export const updateLabSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Lab name must be at least 2 characters")
    .max(100, "Lab name cannot exceed 100 characters"),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid contact email address"),
  contactPhone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateLabFormValues = z.infer<typeof createLabSchema>;
export type UpdateLabFormValues = z.infer<typeof updateLabSchema>;
