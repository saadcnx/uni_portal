import mongoose from "mongoose";
import { ROLES } from "../../constants/roles.js";
import type { AuthUser } from "../../types/express.d.js";
import { ApiError } from "../../utils/ApiError.js";
import { GENDERS, Patient } from "../patients/patient.model.js";
import { Tenant, TENANT_STATUS } from "../tenants/tenant.model.js";
import { User } from "../users/user.model.js";

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
  dateOfBirth: Date;
  createdAt: Date;
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

/**
 * Returns UTC start of today (00:00:00.000Z).
 */
export function getStartOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Generates an array of exactly N chronological YYYY-MM-DD strings ending with today.
 */
export function getLastNDaysUTC(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(utcYear, utcMonth, utcDate - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Returns UTC timestamp for start of N-1 days ago (N-day window start at 00:00:00.000Z).
 */
export function getStartOfNDaysAgoUTC(n: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (n - 1),
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Generates an array of exactly 7 chronological YYYY-MM-DD strings ending with today.
 */
export function getLast7DaysUTC(): string[] {
  return getLastNDaysUTC(7);
}

/**
 * Returns UTC timestamp for start of 6 days ago (7-day window start).
 */
export function getStartOf7DaysAgoUTC(): Date {
  return getStartOfNDaysAgoUTC(7);
}

/**
 * Generates an array of exactly 6 chronological YYYY-MM strings ending with current month.
 */
export function getLast6MonthsUTC(): string[] {
  const months: string[] = [];
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(utcYear, utcMonth - i, 1));
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    months.push(`${yyyy}-${mm}`);
  }
  return months;
}

/**
 * Returns UTC timestamp for start of 5 months ago (6-month window start).
 */
export function getStartOf6MonthsAgoUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0)
  );
}

/**
 * Service for computing role-based dashboard statistics.
 * Decoupled from Express request/response objects for testability.
 */
export class DashboardService {
  /**
   * Dispatches stats computation based on caller's role.
   */
  static async getStats(
    currentUser: AuthUser,
    daysParam?: number | string
  ): Promise<DashboardStats> {
    const parsedDays = Number(daysParam);
    const days = [7, 30, 90].includes(parsedDays) ? parsedDays : 7;

    switch (currentUser.role) {
      case ROLES.SUPER_ADMIN:
        return this.getSuperAdminStats();
      case ROLES.LAB_ADMIN:
        return this.getLabAdminStats(currentUser, days);
      case ROLES.DOCTOR:
        return this.getDoctorStats(currentUser, days);
      case ROLES.RECEPTIONIST:
        return this.getReceptionistStats(currentUser, days);
      default:
        throw ApiError.forbidden("Access denied: invalid role for dashboard");
    }
  }

  /**
   * SUPER_ADMIN stats:
   * - cards: { totalLabs, activeLabs, totalUsers }
   * - charts: { labsByMonth (6 months), usersByRole }
   */
  private static async getSuperAdminStats(): Promise<SuperAdminDashboardStats> {
    const startOf6MonthsAgo = getStartOf6MonthsAgoUTC();
    const last6Months = getLast6MonthsUTC();

    const [totalLabs, activeLabs, totalUsers, labsAgg, usersAgg] =
      await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: TENANT_STATUS.ACTIVE }),
        User.countDocuments(),
        Tenant.aggregate<{ _id: string; count: number }>([
          {
            $match: {
              createdAt: { $gte: startOf6MonthsAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
        ]),
        User.aggregate<{ _id: string; count: number }>([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const labCountMap = new Map(labsAgg.map((l) => [l._id, l.count]));
    const labsByMonth = last6Months.map((month) => ({
      month,
      count: labCountMap.get(month) ?? 0,
    }));

    const roleMap = new Map(usersAgg.map((u) => [u._id, u.count]));
    const usersByRole = Object.values(ROLES).map((role) => ({
      role,
      count: roleMap.get(role) ?? 0,
    }));

    return {
      cards: {
        totalLabs,
        activeLabs,
        totalUsers,
      },
      charts: {
        labsByMonth,
        usersByRole,
      },
    };
  }

  /**
   * LAB_ADMIN stats:
   * - cards: { totalPatients, patientsToday, totalStaff }
   * - charts: { registrationsLast7Days (or N days), genderBreakdown }
   * - recentPatients: up to 5 patients
   */
  private static async getLabAdminStats(
    currentUser: AuthUser,
    days: number = 7
  ): Promise<LabAdminDashboardStats> {
    if (!currentUser.tenantId) {
      throw ApiError.forbidden("User is not assigned to any laboratory");
    }

    const tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);
    const startOfToday = getStartOfTodayUTC();
    const startOfPeriodAgo = getStartOfNDaysAgoUTC(days);
    const periodDays = getLastNDaysUTC(days);

    const [
      totalPatients,
      patientsToday,
      totalStaff,
      registrationsAgg,
      genderAgg,
      recentDocs,
    ] = await Promise.all([
      Patient.countDocuments({ tenantId, isActive: true }),
      Patient.countDocuments({
        tenantId,
        isActive: true,
        createdAt: { $gte: startOfToday },
      }),
      User.countDocuments({ tenantId, isActive: true }),
      Patient.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            tenantId,
            isActive: true,
            createdAt: { $gte: startOfPeriodAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Patient.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            tenantId,
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$gender",
            count: { $sum: 1 },
          },
        },
      ]),
      Patient.find({ tenantId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const regCountMap = new Map(registrationsAgg.map((r) => [r._id, r.count]));
    const registrations = periodDays.map((date) => ({
      date,
      count: regCountMap.get(date) ?? 0,
    }));

    const genderMap = new Map(genderAgg.map((g) => [g._id, g.count]));
    const genderBreakdown = Object.values(GENDERS).map((gender) => ({
      gender,
      count: genderMap.get(gender) ?? 0,
    }));

    const recentPatients: RecentPatientItem[] = recentDocs.map((p) => ({
      id: p._id.toString(),
      patientCode: p.patientCode,
      name: p.name,
      phone: p.phone,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      createdAt: p.createdAt,
    }));

    return {
      cards: {
        totalPatients,
        patientsToday,
        totalStaff,
      },
      charts: {
        registrations,
        registrationsLast7Days: registrations,
        genderBreakdown,
      },
      recentPatients,
    };
  }

  /**
   * DOCTOR stats:
   * - cards: { totalPatients, patientsToday }
   * - charts: { registrationsLast7Days (or N days), genderBreakdown }
   * - recentPatients: up to 5 patients
   */
  private static async getDoctorStats(
    currentUser: AuthUser,
    days: number = 7
  ): Promise<DoctorDashboardStats> {
    if (!currentUser.tenantId) {
      throw ApiError.forbidden("User is not assigned to any laboratory");
    }

    const tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);
    const startOfToday = getStartOfTodayUTC();
    const startOfPeriodAgo = getStartOfNDaysAgoUTC(days);
    const periodDays = getLastNDaysUTC(days);

    const [
      totalPatients,
      patientsToday,
      registrationsAgg,
      genderAgg,
      recentDocs,
    ] = await Promise.all([
      Patient.countDocuments({ tenantId, isActive: true }),
      Patient.countDocuments({
        tenantId,
        isActive: true,
        createdAt: { $gte: startOfToday },
      }),
      Patient.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            tenantId,
            isActive: true,
            createdAt: { $gte: startOfPeriodAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Patient.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            tenantId,
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$gender",
            count: { $sum: 1 },
          },
        },
      ]),
      Patient.find({ tenantId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const regCountMap = new Map(registrationsAgg.map((r) => [r._id, r.count]));
    const registrations = periodDays.map((date) => ({
      date,
      count: regCountMap.get(date) ?? 0,
    }));

    const genderMap = new Map(genderAgg.map((g) => [g._id, g.count]));
    const genderBreakdown = Object.values(GENDERS).map((gender) => ({
      gender,
      count: genderMap.get(gender) ?? 0,
    }));

    const recentPatients: RecentPatientItem[] = recentDocs.map((p) => ({
      id: p._id.toString(),
      patientCode: p.patientCode,
      name: p.name,
      phone: p.phone,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      createdAt: p.createdAt,
    }));

    return {
      cards: {
        totalPatients,
        patientsToday,
      },
      charts: {
        registrations,
        registrationsLast7Days: registrations,
        genderBreakdown,
      },
      recentPatients,
    };
  }

  /**
   * RECEPTIONIST stats:
   * - cards: { registeredToday, totalPatients }
   * - charts: { registrationsLast7Days (or N days) }
   * - recentPatients: up to 5 patients
   */
  private static async getReceptionistStats(
    currentUser: AuthUser,
    days: number = 7
  ): Promise<ReceptionistDashboardStats> {
    if (!currentUser.tenantId) {
      throw ApiError.forbidden("User is not assigned to any laboratory");
    }

    const tenantId = new mongoose.Types.ObjectId(currentUser.tenantId);
    const startOfToday = getStartOfTodayUTC();
    const startOfPeriodAgo = getStartOfNDaysAgoUTC(days);
    const periodDays = getLastNDaysUTC(days);

    const [registeredToday, totalPatients, registrationsAgg, recentDocs] =
      await Promise.all([
        Patient.countDocuments({
          tenantId,
          createdBy: new mongoose.Types.ObjectId(currentUser.id),
          isActive: true,
          createdAt: { $gte: startOfToday },
        }),
        Patient.countDocuments({ tenantId, isActive: true }),
        Patient.aggregate<{ _id: string; count: number }>([
          {
            $match: {
              tenantId,
              isActive: true,
              createdAt: { $gte: startOfPeriodAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
        ]),
        Patient.find({ tenantId, isActive: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const regCountMap = new Map(registrationsAgg.map((r) => [r._id, r.count]));
    const registrations = periodDays.map((date) => ({
      date,
      count: regCountMap.get(date) ?? 0,
    }));

    const recentPatients: RecentPatientItem[] = recentDocs.map((p) => ({
      id: p._id.toString(),
      patientCode: p.patientCode,
      name: p.name,
      phone: p.phone,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      createdAt: p.createdAt,
    }));

    return {
      cards: {
        registeredToday,
        totalPatients,
      },
      charts: {
        registrations,
        registrationsLast7Days: registrations,
      },
      recentPatients,
    };
  }
}
