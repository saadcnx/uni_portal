export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Patient {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  address?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePatientInput {
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  address?: string;
}

export interface UpdatePatientInput {
  name?: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
}

export interface ListPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: Gender | string;
  sort?: string;
}
