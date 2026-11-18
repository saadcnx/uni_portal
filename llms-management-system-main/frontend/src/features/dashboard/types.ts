export interface SuperAdminDashboardStats {
  cards: {
    totalLabs: number;
    activeLabs: number;
    totalUsers: number;
  };
  charts: {
    labsByMonth: Array<{ month: string; count: number }>;
    usersByRole: Array<{ role: string; count: number }>;
  };
}

export interface RecentPatientItem {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: string | Date;
  createdAt: string | Date;
}

export interface LabAdminDashboardStats {
  cards: {
    totalPatients: number;
    patientsToday: number;
    totalStaff: number;
  };
  charts: {
    registrations?: Array<{ date: string; count: number }>;
    registrationsLast7Days: Array<{ date: string; count: number }>;
    genderBreakdown: Array<{ gender: string; count: number }>;
  };
  recentPatients: RecentPatientItem[];
}

export interface DoctorDashboardStats {
  cards: {
    totalPatients: number;
    patientsToday: number;
  };
  charts: {
    registrations?: Array<{ date: string; count: number }>;
    registrationsLast7Days: Array<{ date: string; count: number }>;
    genderBreakdown: Array<{ gender: string; count: number }>;
  };
  recentPatients: RecentPatientItem[];
}

export interface ReceptionistDashboardStats {
  cards: {
    registeredToday: number;
    totalPatients: number;
  };
  charts: {
    registrations?: Array<{ date: string; count: number }>;
    registrationsLast7Days: Array<{ date: string; count: number }>;
  };
  recentPatients: RecentPatientItem[];
}

export type DashboardStats =
  | SuperAdminDashboardStats
  | LabAdminDashboardStats
  | DoctorDashboardStats
  | ReceptionistDashboardStats;
