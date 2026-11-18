import { z } from "zod";
import { GENDERS, type Gender } from "./patient.model.js";

const genderValues = Object.values(GENDERS) as [Gender, ...Gender[]];

const phoneRegex = /^\+?[0-9]{7,15}$/;

/**
 * Validates date string or Date object to ensure it is a valid date strictly in the past.
 */
const pastDateSchema = z
  .union([z.string(), z.date()])
  .transform((val) => (val instanceof Date ? val : new Date(val)))
  .refine((date) => !isNaN(date.getTime()), {
    message: "Invalid date format",
  })
  .refine((date) => date.getTime() < Date.now(), {
    message: "Date of birth must be a past date",
  });

/**
 * Validation schema for registering a new Patient.
 */
export const createPatientSchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name cannot exceed 80 characters"),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Phone must be between 7 and 15 digits with optional leading plus"),
    gender: z.enum(genderValues),
    dateOfBirth: pastDateSchema,
    address: z
      .string()
      .trim()
      .max(200, "Address cannot exceed 200 characters")
      .optional(),
  }),
};

/**
 * Validation schema for updating a Patient.
 */
export const updatePatientSchema = {
  params: z.object({
    id: z.string().min(1, "Patient ID is required"),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(80, "Name cannot exceed 80 characters")
        .optional(),
      phone: z
        .string()
        .trim()
        .regex(phoneRegex, "Phone must be between 7 and 15 digits with optional leading plus")
        .optional(),
      gender: z.enum(genderValues).optional(),
      dateOfBirth: pastDateSchema.optional(),
      address: z
        .string()
        .trim()
        .max(200, "Address cannot exceed 200 characters")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};

/**
 * Validation schema for route parameters with Patient ID.
 */
export const patientParamsSchema = {
  params: z.object({
    id: z.string().min(1, "Patient ID is required"),
  }),
};

/**
 * Validation schema for querying patients with pagination, search, and gender filter.
 */
export const listPatientsSchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    gender: z.enum(genderValues).optional(),
    sort: z.string().optional(),
  }),
};

export type CreatePatientInput = z.infer<typeof createPatientSchema.body>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema.body>;
export type ListPatientsQuery = z.infer<typeof listPatientsSchema.query>;
