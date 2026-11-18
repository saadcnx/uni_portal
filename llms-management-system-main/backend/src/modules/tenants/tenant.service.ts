import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { ROLES } from "../../constants/roles.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginateResult, prefixRegex } from "../../utils/paginate.js";
import { User } from "../users/user.model.js";
import { Tenant, TENANT_STATUS, type ITenant, type TenantStatus } from "./tenant.model.js";
import type { CreateTenantInput, ListTenantsQuery, UpdateTenantInput } from "./tenant.validation.js";

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  contactEmail?: string;
  contactPhone?: string;
  userCount: number;
  createdAt: Date;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantResult {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    contactEmail?: string;
    contactPhone?: string;
    createdAt: Date;
  };
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    tenantId: string;
  };
}

/**
 * Transforms string into URL-friendly slug.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Service handling Tenant business logic.
 * Decoupled from Express request/response objects.
 */
export class TenantService {
  /**
   * Generates a unique slug by appending incremental numeric suffixes if duplicates exist.
   */
  private static async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name) || "tenant";
    let slug = baseSlug;
    let suffix = 1;

    while (await Tenant.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    return slug;
  }

  /**
   * Creates a tenant and its primary Lab Admin.
   * Rollback simulation: if user creation fails, deletes the tenant to prevent orphan records.
   */
  static async createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
    const normalizedAdminEmail = input.admin.email.trim().toLowerCase();

    // 1. Check if admin email is already registered
    const existingAdmin = await User.findOne({ email: normalizedAdminEmail });
    if (existingAdmin) {
      throw ApiError.conflict("Admin email already exists", [
        { field: "admin.email", message: "A user with this email address already exists" },
      ]);
    }

    // 2. Generate unique slug
    const slug = await this.generateUniqueSlug(input.name);

    // 3. Create Tenant document
    const tenant = await Tenant.create({
      name: input.name.trim(),
      slug,
      status: TENANT_STATUS.ACTIVE,
      contactEmail: input.contactEmail?.trim().toLowerCase(),
      contactPhone: input.contactPhone?.trim(),
    });

    // 4. Create primary Lab Admin for the created tenant
    let adminUser;
    try {
      const passwordHash = await bcrypt.hash(input.admin.password, env.BCRYPT_ROUNDS);
      adminUser = await User.create({
        name: input.admin.name.trim(),
        email: normalizedAdminEmail,
        passwordHash,
        role: ROLES.LAB_ADMIN,
        tenantId: tenant._id,
        isActive: true,
      });
    } catch (error) {
      // Clean up newly created tenant if admin creation fails (compensating transaction)
      await Tenant.findByIdAndDelete(tenant._id);
      throw error;
    }

    return {
      tenant: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
        createdAt: tenant.createdAt,
      },
      admin: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive,
        tenantId: tenant._id.toString(),
      },
    };
  }

  /**
   * Lists tenants with pagination, search, status filter, and aggregate user count.
   */
  static async listTenants(
    query: ListTenantsQuery
  ): Promise<PaginateResult<TenantListItem>> {
    const filter: Record<string, unknown> = {};

    if (query.search && query.search.trim() !== "") {
      filter.name = prefixRegex(query.search.trim());
    }

    if (query.status) {
      filter.status = query.status;
    }

    const sort = query.sort || "-createdAt";

    // Paginate tenants
    const paginatedTenants = await paginate<ITenant>(Tenant, filter, {
      page: query.page,
      limit: query.limit,
      sort,
    });

    const tenantIds = paginatedTenants.data.map((t) => t._id);

    // Compute user counts in a single aggregation pipeline
    const userCountAgg = await User.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: "$tenantId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>(
      userCountAgg.map((item) => [item._id.toString(), item.count])
    );

    const formattedData: TenantListItem[] = paginatedTenants.data.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      slug: t.slug,
      status: t.status,
      contactEmail: t.contactEmail,
      contactPhone: t.contactPhone,
      userCount: countMap.get(t._id.toString()) || 0,
      createdAt: t.createdAt,
    }));

    return {
      data: formattedData,
      meta: paginatedTenants.meta,
    };
  }

  /**
   * Retrieves single tenant by ID.
   */
  static async getTenant(id: string): Promise<TenantResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Tenant not found");
    }

    const tenant = await Tenant.findById(id).lean();
    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    return {
      id: tenant._id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Updates tenant fields.
   */
  static async updateTenant(
    id: string,
    input: UpdateTenantInput
  ): Promise<TenantResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Tenant not found");
    }

    const updated = await Tenant.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw ApiError.notFound("Tenant not found");
    }

    return {
      id: updated._id.toString(),
      name: updated.name,
      slug: updated.slug,
      status: updated.status,
      contactEmail: updated.contactEmail,
      contactPhone: updated.contactPhone,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
