export type TenantStatus = "ACTIVE" | "INACTIVE";

export interface Lab {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  contactEmail?: string;
  contactPhone?: string;
  userCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface LabAdminInput {
  name: string;
  email: string;
  password: string;
}

export interface CreateLabInput {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  admin: LabAdminInput;
}

export interface UpdateLabInput {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: TenantStatus;
}

export interface ListLabsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
}
