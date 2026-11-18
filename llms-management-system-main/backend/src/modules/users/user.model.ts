import mongoose, { type Document, type Model, Schema } from "mongoose";
import { ROLES, type Role } from "../../constants/roles.js";
import { tenantPlugin } from "../../plugins/tenant.plugin.js";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId | null;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant plugin with allowNull: true for super admins
UserSchema.plugin(tenantPlugin, { allowNull: true });

// Compound indexes: { tenantId, role }; { tenantId, createdAt: -1 }
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, createdAt: -1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
