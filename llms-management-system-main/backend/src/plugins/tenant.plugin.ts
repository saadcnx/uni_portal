import mongoose, { type Aggregate, type Query, Schema } from "mongoose";
import { getTenantContext } from "../context/tenantContext.js";

export interface TenantPluginOptions {
  allowNull?: boolean;
}

/**
 * Mongoose plugin for strict logical multi-tenant isolation.
 * Automatically scopes find, findOne, countDocuments, updateOne, updateMany,
 * findOneAndUpdate, deleteOne, and aggregate pipelines by tenantId derived
 * from the active AsyncLocalStorage tenant context.
 */
export function tenantPlugin(schema: Schema, options: TenantPluginOptions = {}): void {
  const allowNull = options.allowNull ?? false;

  // Add indexed tenantId field if not already present on schema
  if (!schema.path("tenantId")) {
    schema.add({
      tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: !allowNull,
        index: true,
        default: allowNull ? null : undefined,
      },
    });
  }

  // Pre-validate and Pre-save hooks to automatically inject tenantId on new documents
  function injectTenantId(this: mongoose.Document) {
    const context = getTenantContext();

    if (this.isNew) {
      if (context && !context.isSuperAdmin && context.tenantId) {
        if (!this.get("tenantId")) {
          this.set(
            "tenantId",
            mongoose.Types.ObjectId.isValid(context.tenantId)
              ? new mongoose.Types.ObjectId(context.tenantId)
              : context.tenantId
          );
        }
      }
    }
  }

  schema.pre("validate", injectTenantId);
  schema.pre("save", injectTenantId);

  // Query middleware: find, findOne, countDocuments, updateOne, updateMany, findOneAndUpdate, deleteOne
  const queryOperations = [
    "find",
    "findOne",
    "countDocuments",
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "deleteOne",
    "deleteMany",
  ] as const;

  for (const op of queryOperations) {
    schema.pre(op, function (this: Query<unknown, unknown>) {
      const context = getTenantContext();

      // Bypass filter if no tenant context exists or user is SUPER_ADMIN
      if (!context || context.isSuperAdmin) {
        return;
      }

      if (context.tenantId) {
        const currentQuery = this.getQuery();
        this.setQuery({
          ...currentQuery,
          tenantId: mongoose.Types.ObjectId.isValid(context.tenantId)
            ? new mongoose.Types.ObjectId(context.tenantId)
            : context.tenantId,
        });
      }
    });
  }

  // Aggregation middleware: prepend $match stage
  schema.pre("aggregate", function (this: Aggregate<unknown>) {
    const context = getTenantContext();

    // Bypass filter if no tenant context exists or user is SUPER_ADMIN
    if (!context || context.isSuperAdmin) {
      return;
    }

    if (context.tenantId) {
      const tenantMatch = mongoose.Types.ObjectId.isValid(context.tenantId)
        ? new mongoose.Types.ObjectId(context.tenantId)
        : context.tenantId;

      this.pipeline().unshift({
        $match: {
          tenantId: tenantMatch,
        },
      });
    }
  });
}
