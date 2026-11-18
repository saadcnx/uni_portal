import { z } from "zod";
import { TENANT_STATUS } from "./tenant.model.js";

/**
 * Validation schema for creating a new Tenant and its initial Lab Admin.
 */
export const createTenantSchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    contactEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid contact email"),
    contactPhone: z
      .string()
      .trim()
      .optional(),
    admin: z.object({
      name: z
        .string()
        .trim()
        .min(2, "Admin name must be at least 2 characters")
        .max(80, "Admin name cannot exceed 80 characters"),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid admin email"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters"),
    }),
  }),
};

/**
 * Validation schema for updating a Tenant.
 */
export const updateTenantSchema = {
  params: z.object({
    id: z.string().min(1, "Tenant ID is required"),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      contactEmail: z.string().trim().toLowerCase().email().optional(),
      contactPhone: z.string().trim().optional(),
      status: z.enum([TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};

/**
 * Validation schema for route parameters with Tenant ID.
 */
export const tenantParamsSchema = {
  params: z.object({
    id: z.string().min(1, "Tenant ID is required"),
  }),
};

/**
 * Validation schema for listing Tenants.
 */
export const listTenantsSchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum([TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE]).optional(),
    sort: z.string().optional(),
  }),
};

export type CreateTenantInput = z.infer<typeof createTenantSchema.body>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema.body>;
export type ListTenantsQuery = z.infer<typeof listTenantsSchema.query>;
