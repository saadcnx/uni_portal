import mongoose from "mongoose";
import type { AuthUser } from "../../types/express.d.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  escapeRegex,
  paginate,
  type PaginateResult,
} from "../../utils/paginate.js";
import { Counter } from "./counter.model.js";
import { type Gender, type IPatient, Patient } from "./patient.model.js";
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from "./patient.validation.js";

export interface PatientListItem {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface PatientResponse {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date;
  address?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service handling Patient management operations:
 * registration with atomic patientCode generation, list with search/filters,
 * details retrieval, updates, and soft deletion.
 */
export class PatientService {
  /**
   * Registers a new patient with an atomic per-tenant sequence code (PT-0001 format).
   */
  static async createPatient(
    input: CreatePatientInput,
    currentUser: AuthUser
  ): Promise<PatientResponse> {
    if (!currentUser.tenantId) {
      throw ApiError.forbidden("User is not assigned to any laboratory");
    }

    const tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);

    // Atomic increment of the tenant's patient counter
    const counter = await Counter.findOneAndUpdate(
      { tenantId, key: "patientCode" },
      { $inc: { seq: 1 }, $setOnInsert: { tenantId, key: "patientCode" } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const patientCode = `PT-${String(counter.seq).padStart(4, "0")}`;

    const patient = await Patient.create({
      tenantId,
      patientCode,
      name: input.name.trim(),
      phone: input.phone.trim(),
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      address: input.address?.trim() || null,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(currentUser.id),
      updatedBy: new mongoose.Types.ObjectId(currentUser.id),
    });

    return {
      id: patient._id.toString(),
      patientCode: patient.patientCode,
      name: patient.name,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      isActive: patient.isActive,
      createdBy: patient.createdBy ? patient.createdBy.toString() : null,
      updatedBy: patient.updatedBy ? patient.updatedBy.toString() : null,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  /**
   * Lists active patients with pagination, search on name, patientCode, or phone,
   * gender filter, and sorting.
   */
  static async listPatients(
    query: ListPatientsQuery,
    currentUser: AuthUser
  ): Promise<PaginateResult<PatientListItem>> {
    const filter: Record<string, unknown> = {
      isActive: true, // Soft delete exclusion: lists only return active patients
    };

    if (currentUser.isSuperAdmin) {
      if (currentUser.tenantId) {
        filter.tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);
      }
    } else {
      if (!currentUser.tenantId) {
        throw ApiError.forbidden("User is not assigned to any laboratory");
      }
      filter.tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);
    }

    // Case-insensitive substring search on name, patientCode, or phone
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const escaped = escapeRegex(term);
      const isDigitsOrPhone = /^[+\d\s\-()]+$/.test(term);

      const branches: Array<Record<string, unknown>> = [
        { name: new RegExp(escaped, "i") },
        { patientCode: new RegExp(escaped, "i") },
      ];

      if (isDigitsOrPhone) {
        branches.push({ phone: new RegExp(escaped, "i") });
      }

      if (branches.length === 1) {
        Object.assign(filter, branches[0]);
      } else if (branches.length > 1) {
        filter.$or = branches;
      }
    }

    if (query.gender) {
      filter.gender = query.gender;
    }

    const sort = query.sort || "-createdAt";

    const paginatedResult = await paginate<IPatient>(Patient, filter, {
      page: query.page,
      limit: query.limit,
      sort,
    });

    const formattedData: PatientListItem[] = paginatedResult.data.map((p) => ({
      id: p._id.toString(),
      patientCode: p.patientCode,
      name: p.name,
      phone: p.phone,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      address: p.address ?? null,
      isActive: p.isActive ?? true,
      createdAt: p.createdAt,
    }));

    return {
      data: formattedData,
      meta: paginatedResult.meta,
    };
  }

  /**
   * Retrieves single patient by ID respecting tenant isolation.
   */
  static async getPatient(
    id: string,
    currentUser: AuthUser
  ): Promise<PatientResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Patient not found");
    }

    const patient = await Patient.findById(id).lean();
    if (!patient) {
      throw ApiError.notFound("Patient not found");
    }

    if (
      !currentUser.isSuperAdmin &&
      (!patient.tenantId ||
        patient.tenantId.toString() !== currentUser.tenantId)
    ) {
      throw ApiError.notFound("Patient not found");
    }

    return {
      id: patient._id.toString(),
      patientCode: patient.patientCode,
      name: patient.name,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      isActive: patient.isActive,
      createdBy: patient.createdBy ? patient.createdBy.toString() : null,
      updatedBy: patient.updatedBy ? patient.updatedBy.toString() : null,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  /**
   * Updates patient details and records updatedBy user ID.
   */
  static async updatePatient(
    id: string,
    input: UpdatePatientInput,
    currentUser: AuthUser
  ): Promise<PatientResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Patient not found");
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      throw ApiError.notFound("Patient not found");
    }

    if (
      !currentUser.isSuperAdmin &&
      (!patient.tenantId ||
        patient.tenantId.toString() !== currentUser.tenantId)
    ) {
      throw ApiError.notFound("Patient not found");
    }

    if (input.name !== undefined) {
      patient.name = input.name.trim();
    }
    if (input.phone !== undefined) {
      patient.phone = input.phone.trim();
    }
    if (input.gender !== undefined) {
      patient.gender = input.gender;
    }
    if (input.dateOfBirth !== undefined) {
      patient.dateOfBirth = input.dateOfBirth;
    }
    if (input.address !== undefined) {
      patient.address = input.address.trim() || null;
    }

    patient.updatedBy = new mongoose.Types.ObjectId(currentUser.id);
    await patient.save();

    return {
      id: patient._id.toString(),
      patientCode: patient.patientCode,
      name: patient.name,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      isActive: patient.isActive,
      createdBy: patient.createdBy ? patient.createdBy.toString() : null,
      updatedBy: patient.updatedBy ? patient.updatedBy.toString() : null,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  /**
   * Soft deletes a patient (isActive: false) and records updatedBy user ID.
   */
  static async deletePatient(
    id: string,
    currentUser: AuthUser
  ): Promise<PatientResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.notFound("Patient not found");
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      throw ApiError.notFound("Patient not found");
    }

    if (
      !currentUser.isSuperAdmin &&
      (!patient.tenantId ||
        patient.tenantId.toString() !== currentUser.tenantId)
    ) {
      throw ApiError.notFound("Patient not found");
    }

    patient.isActive = false;
    patient.updatedBy = new mongoose.Types.ObjectId(currentUser.id);
    await patient.save();

    return {
      id: patient._id.toString(),
      patientCode: patient.patientCode,
      name: patient.name,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      isActive: patient.isActive,
      createdBy: patient.createdBy ? patient.createdBy.toString() : null,
      updatedBy: patient.updatedBy ? patient.updatedBy.toString() : null,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
}
