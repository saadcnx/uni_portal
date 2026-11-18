import mongoose, { type Document, type Model, Schema } from "mongoose";
import { tenantPlugin } from "../../plugins/tenant.plugin.js";

export const GENDERS = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;

export type Gender = (typeof GENDERS)[keyof typeof GENDERS];

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientCode: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date;
  address?: string | null;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    patientCode: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: Object.values(GENDERS),
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant plugin
PatientSchema.plugin(tenantPlugin);

// Compound indexes as specified in BACKEND.md section 4 and PERFORMANCE.md section 2
PatientSchema.index({ tenantId: 1, patientCode: 1 }, { unique: true });
PatientSchema.index({ tenantId: 1, createdAt: -1 });
PatientSchema.index({ tenantId: 1, name: 1 });
PatientSchema.index({ tenantId: 1, phone: 1 });
PatientSchema.index({ tenantId: 1, isActive: 1, createdAt: -1 });
PatientSchema.index({ tenantId: 1, isActive: 1, name: 1 });
PatientSchema.index({ tenantId: 1, isActive: 1, phone: 1 });

export const Patient: Model<IPatient> =
  mongoose.models.Patient ||
  mongoose.model<IPatient>("Patient", PatientSchema);
