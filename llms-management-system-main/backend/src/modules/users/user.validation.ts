import { z } from "zod";
import { ROLES, type Role } from "../../constants/roles.js";

const roleValues = Object.values(ROLES) as [Role, ...Role[]];

/**
 * Validation schema for creating a new User.
 */
export const createUserSchema = {
  body: z.object({
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
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        "Password must contain at least one letter and one number"
      ),
    role: z.enum(roleValues),
    tenantId: z.string().trim().optional(),
  }),
};

/**
 * Validation schema for updating an existing User.
 */
export const updateUserSchema = {
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(80, "Name cannot exceed 80 characters")
        .optional(),
      role: z.enum(roleValues).optional(),
      isActive: z.boolean().optional(),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
          /^(?=.*[a-zA-Z])(?=.*\d)/,
          "Password must contain at least one letter and one number"
        )
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};

/**
 * Validation schema for route parameters with User ID.
 */
export const userParamsSchema = {
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
};

/**
 * Validation schema for querying users with pagination, search, and filters.
 */
export const listUsersSchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.enum(roleValues).optional(),
    isActive: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((val) => (typeof val === "boolean" ? val : val === "true"))
      .optional(),
    sort: z.string().optional(),
    tenantId: z.string().optional(),
  }),
};

export type CreateUserInput = z.infer<typeof createUserSchema.body>;
export type UpdateUserInput = z.infer<typeof updateUserSchema.body>;
export type ListUsersQuery = z.infer<typeof listUsersSchema.query>;
