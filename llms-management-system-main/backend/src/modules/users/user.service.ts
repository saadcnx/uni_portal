import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { ROLES, type Role } from "../../constants/roles.js";
import type { AuthUser } from "../../types/express.d.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginateResult,
  prefixRegex,
} from "../../utils/paginate.js";
import { Tenant } from "../tenants/tenant.model.js";
import { type IUser, User } from "./user.model.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from "./user.validation.js";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: Date;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Service handling User business logic.
 * Decoupled from Express request/response objects for testability.
 */
export class UserService {
  /**
   * Lists users with pagination, prefix search (name or email), role and isActive filters,
   * sort, tenant isolation, and tenantName populated.
   */
  static async listUsers(
    query: ListUsersQuery,
    currentUser: AuthUser
  ): Promise<PaginateResult<UserListItem>> {
    const filter: Record<string, unknown> = {};

    // 1. Prefix search on name or email
    if (query.search && query.search.trim()) {
      const regex = prefixRegex(query.search.trim());
      filter.$or = [{ name: regex }, { email: regex }];
    }

    // 2. Role filter
    if (query.role) {
      filter.role = query.role;
    }

    // 3. isActive filter
    if (typeof query.isActive === "boolean") {
      filter.isActive = query.isActive;
    }

    // 4. Tenant isolation scoping
    if (currentUser.isSuperAdmin) {
      if (query.tenantId && query.tenantId.trim()) {
        if (mongoose.Types.ObjectId.isValid(query.tenantId)) {
          filter.tenantId = new mongoose.Types.ObjectId(query.tenantId);
        } else {
          filter.tenantId = new mongoose.Types.ObjectId();
        }
      }
    } else {
      if (!currentUser.tenantId) {
        throw ApiError.forbidden("User is not assigned to any laboratory");
      }
      filter.tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);
    }

    const sort = query.sort || "-createdAt";

    // Paginate users
    const paginatedUsers = await paginate<IUser>(User, filter, {
      page: query.page,
      limit: query.limit,
      sort,
    });

    // 5. Lean populate tenantName
    const tenantIds = [
      ...new Set(
        paginatedUsers.data
          .map((u) => u.tenantId?.toString())
          .filter((id): id is string => Boolean(id))
      ),
    ];

    let tenantMap = new Map<string, string>();
    if (tenantIds.length > 0) {
      const tenants = await Tenant.find(
        { _id: { $in: tenantIds } },
        { name: 1 }
      ).lean();
      tenantMap = new Map(tenants.map((t) => [t._id.toString(), t.name]));
    }

    const formattedData: UserListItem[] = paginatedUsers.data.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      tenantId: u.tenantId ? u.tenantId.toString() : null,
      tenantName: u.tenantId
        ? (tenantMap.get(u.tenantId.toString()) ?? null)
        : null,
      createdAt: u.createdAt,
    }));

    return {
      data: formattedData,
      meta: paginatedUsers.meta,
    };
  }

  /**
   * Creates a user enforcing role constraints, tenant scoping, and email uniqueness.
   */
  static async createUser(
    input: CreateUserInput,
    currentUser: AuthUser
  ): Promise<UserResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Email uniqueness check
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw ApiError.conflict("A user with this email already exists", [
        { field: "email", message: "Email is already registered" },
      ]);
    }

    // 2. Role and tenant assignment rules
    let assignedTenantId: mongoose.Types.ObjectId;
    let assignedTenantName: string | null;

    if (currentUser.isSuperAdmin) {
      if (input.role === ROLES.SUPER_ADMIN) {
        throw ApiError.forbidden("Cannot create SUPER_ADMIN user");
      }

      if (!input.tenantId || !input.tenantId.trim()) {
        throw ApiError.badRequest(
          "tenantId is required when creating a user as Super Admin",
          [{ field: "tenantId", message: "tenantId is required" }]
        );
      }

      if (!mongoose.Types.ObjectId.isValid(input.tenantId)) {
        throw ApiError.badRequest("Invalid tenantId format", [
          { field: "tenantId", message: "Invalid tenantId format" },
        ]);
      }

      const tenant = await Tenant.findById(input.tenantId).lean();
      if (!tenant) {
        throw ApiError.notFound("Tenant not found");
      }

      assignedTenantId = tenant._id;
      assignedTenantName = tenant.name;
    } else {
      // Lab Admin: can only create DOCTOR or RECEPTIONIST
      if (
        input.role === ROLES.SUPER_ADMIN ||
        input.role === ROLES.LAB_ADMIN
      ) {
        throw ApiError.forbidden(
          "Lab Admin cannot assign SUPER_ADMIN or LAB_ADMIN role"
        );
      }

      if (
        input.role !== ROLES.DOCTOR &&
        input.role !== ROLES.RECEPTIONIST
      ) {
        throw ApiError.forbidden(
          "Lab Admin can only create DOCTOR or RECEPTIONIST users"
        );
      }

      if (!currentUser.tenantId) {
        throw ApiError.forbidden("User is not assigned to any laboratory");
      }

      assignedTenantId = new mongoose.Types.ObjectId(currentUser.tenantId);

      const tenant = await Tenant.findById(assignedTenantId).lean();
      assignedTenantName = tenant?.name ?? null;
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(
      input.password,
      env.BCRYPT_ROUNDS
    );

    // 4. Create User document
    try {
      const user = await User.create({
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: input.role,
        tenantId: assignedTenantId,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(currentUser.id),
      });

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        tenantId: assignedTenantId.toString(),
        tenantName: assignedTenantName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error: unknown) {
      const mongoError = error as { code?: number };
      if (mongoError?.code === 11000) {
        throw ApiError.conflict("A user with this email already exists", [
          { field: "email", message: "Email is already registered" },
        ]);
      }
      throw error;
    }
  }

  /**
   * Retrieves single user by ID respecting tenant isolation.
   */
  static async getUser(
    id: string,
    currentUser: AuthUser
  ): Promise<UserResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("User not found");
    }

    const user = await User.findById(id).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Tenant isolation verification for non-superadmin
    if (
      !currentUser.isSuperAdmin &&
      (!user.tenantId || user.tenantId.toString() !== currentUser.tenantId)
    ) {
      throw ApiError.notFound("User not found");
    }

    let tenantName: string | null = null;
    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId).lean();
      tenantName = tenant?.name ?? null;
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tenantName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Updates user fields with self-protection and role assignment rules.
   */
  static async updateUser(
    id: string,
    input: UpdateUserInput,
    currentUser: AuthUser
  ): Promise<UserResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("User not found");
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      throw ApiError.notFound("User not found");
    }

    // Tenant isolation verification for non-superadmin
    if (
      !currentUser.isSuperAdmin &&
      (!targetUser.tenantId ||
        targetUser.tenantId.toString() !== currentUser.tenantId)
    ) {
      throw ApiError.notFound("User not found");
    }

    const isSelf = currentUser.id === targetUser._id.toString();

    // Rule: nobody can deactivate themselves
    if (isSelf && input.isActive === false) {
      throw ApiError.forbidden("You cannot deactivate your own account");
    }

    // Rule: nobody can change their own role
    if (
      isSelf &&
      input.role !== undefined &&
      input.role !== targetUser.role
    ) {
      throw ApiError.forbidden("You cannot change your own role");
    }

    // Rule: Lab Admin cannot assign SUPER_ADMIN or LAB_ADMIN
    if (!currentUser.isSuperAdmin && input.role !== undefined) {
      if (
        input.role === ROLES.SUPER_ADMIN ||
        input.role === ROLES.LAB_ADMIN
      ) {
        throw ApiError.forbidden(
          "Lab Admin cannot assign SUPER_ADMIN or LAB_ADMIN role"
        );
      }

      if (
        input.role !== ROLES.DOCTOR &&
        input.role !== ROLES.RECEPTIONIST
      ) {
        throw ApiError.forbidden(
          "Lab Admin can only assign DOCTOR or RECEPTIONIST role"
        );
      }
    }

    if (currentUser.isSuperAdmin && input.role === ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Cannot assign SUPER_ADMIN role");
    }

    // Apply updates
    if (input.name !== undefined) {
      targetUser.name = input.name.trim();
    }

    if (input.role !== undefined) {
      targetUser.role = input.role;
    }

    if (input.isActive !== undefined) {
      targetUser.isActive = input.isActive;
    }

    if (input.password !== undefined) {
      targetUser.passwordHash = await bcrypt.hash(
        input.password,
        env.BCRYPT_ROUNDS
      );
    }

    await targetUser.save();

    let tenantName: string | null = null;
    if (targetUser.tenantId) {
      const tenant = await Tenant.findById(targetUser.tenantId).lean();
      tenantName = tenant?.name ?? null;
    }

    return {
      id: targetUser._id.toString(),
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      isActive: targetUser.isActive,
      tenantId: targetUser.tenantId ? targetUser.tenantId.toString() : null,
      tenantName,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    };
  }
}
