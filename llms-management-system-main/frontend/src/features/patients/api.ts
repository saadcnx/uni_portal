import { apiClient } from "@/lib/api-client";
import type { Paginated } from "@/types/api";
import type {
  CreatePatientInput,
  ListPatientsParams,
  Patient,
  UpdatePatientInput,
} from "./types";

/**
 * Fetches a paginated list of patients with search, gender filter, and sorting.
 */
export async function getPatients(
  params?: ListPatientsParams
): Promise<Paginated<Patient>> {
  const query = apiClient.buildQuery(params as Record<string, unknown>);
  return apiClient.get<Paginated<Patient>>(`/patients${query}`);
}

/**
 * Fetches full details for a single patient by ID.
 */
export async function getPatient(id: string): Promise<Patient> {
  return apiClient.get<Patient>(`/patients/${id}`);
}

/**
 * Registers a new patient with auto-generated patientCode.
 */
export async function createPatient(
  data: CreatePatientInput
): Promise<Patient> {
  return apiClient.post<Patient>("/patients", data);
}

/**
 * Updates an existing patient's details.
 */
export async function updatePatient(
  id: string,
  data: UpdatePatientInput
): Promise<Patient> {
  return apiClient.patch<Patient>(`/patients/${id}`, data);
}

/**
 * Soft deletes a patient (sets isActive: false).
 */
export async function deletePatient(id: string): Promise<Patient> {
  return apiClient.del<Patient>(`/patients/${id}`);
}

export const patientsApi = {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  deactivatePatient: deletePatient,
};
