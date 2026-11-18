import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ROLES } from "../constants/roles.js";
import { Counter } from "../modules/patients/counter.model.js";
import { Patient } from "../modules/patients/patient.model.js";
import { Tenant, TENANT_STATUS } from "../modules/tenants/tenant.model.js";
import { User } from "../modules/users/user.model.js";

const DEMO_STAFF_PASSWORD = "DemoStaffPassword123!";

export interface SeedOptions {
  patientCount?: number;
}

/**
 * Idempotent database seeder.
 * - In all environments: Seeds the platform Super Admin from environment variables.
 * - In development: Seeds "Demo Diagnostics" lab, staff accounts, and demo patients
 *   (default 50, or custom count e.g. 100,000 via --patients=100000 or SEED_PATIENTS env).
 */
export async function seed(options?: SeedOptions): Promise<void> {
  logger.info("Starting database seeding...");
  await connectDB();

  // Resolve target patient count from options, CLI flags, or env
  let targetCount = options?.patientCount;
  if (!targetCount) {
    for (const arg of process.argv.slice(2)) {
      if (arg.startsWith("--patients=")) {
        const val = parseInt(arg.split("=")[1], 10);
        if (!isNaN(val)) targetCount = val;
      } else if (arg.startsWith("--count=")) {
        const val = parseInt(arg.split("=")[1], 10);
        if (!isNaN(val)) targetCount = val;
      }
    }
  }
  if (!targetCount && process.env.SEED_PATIENTS) {
    const val = parseInt(process.env.SEED_PATIENTS, 10);
    if (!isNaN(val)) targetCount = val;
  }
  const resolvedTargetCount = targetCount && !isNaN(targetCount) && targetCount > 0 ? targetCount : 50;

  try {
    // 1. Ensure indexes for core models
    logger.info("Synchronizing model indexes...");
    await Tenant.syncIndexes();
    await User.syncIndexes();
    await Patient.syncIndexes();
    await Counter.syncIndexes();

    // 2. Seed Super Admin (Idempotent)
    const superAdminEmail = env.SEED_SUPER_ADMIN_EMAIL.trim().toLowerCase();
    const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

    if (!existingSuperAdmin) {
      const passwordHash = await bcrypt.hash(
        env.SEED_SUPER_ADMIN_PASSWORD,
        env.BCRYPT_ROUNDS
      );

      await User.create({
        name: "Super Admin",
        email: superAdminEmail,
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        tenantId: null,
        isActive: true,
      });

      logger.info({ email: superAdminEmail }, "Super Admin created successfully");
    } else {
      logger.info({ email: superAdminEmail }, "Super Admin already exists, skipping creation");
    }

    // 3. Seed Demo Data (seeds Demo Diagnostics lab, staff, and demo patients)
    const shouldSeedDemo =
      env.NODE_ENV === "development" ||
      process.env.SEED_DEMO !== "false" ||
      process.argv.includes("--demo");

    if (shouldSeedDemo) {
      logger.info("Running demo data seeding (lab, staff users, patients)...");

      // A. Seed Demo Tenant Lab
      let demoLab = await Tenant.findOne({ slug: "demo-diagnostics" });
      if (!demoLab) {
        demoLab = await Tenant.create({
          name: "Demo Diagnostics",
          slug: "demo-diagnostics",
          status: TENANT_STATUS.ACTIVE,
          contactEmail: "contact@demodiagnostics.local",
          contactPhone: "+1-555-0199",
        });
        logger.info({ slug: demoLab.slug }, "Demo Lab 'Demo Diagnostics' created");
      } else {
        logger.info("Demo Lab 'Demo Diagnostics' already exists, skipping creation");
      }

      // Print demo staff password once in the console as requested
      console.log("\n========================================================");
      console.log("  DEMO STAFF CREDENTIALS (DEVELOPMENT ONLY):");
      console.log(`  Password for all demo staff: ${DEMO_STAFF_PASSWORD}`);
      console.log("  Lab Admin:    admin@demodiagnostics.local");
      console.log("  Doctor:       doctor@demodiagnostics.local");
      console.log("  Receptionist: receptionist@demodiagnostics.local");
      console.log("========================================================\n");

      // B. Seed Demo Staff (Lab Admin, Doctor, Receptionist)
      const demoStaffUsers = [
        {
          name: "Demo Lab Admin",
          email: "admin@demodiagnostics.local",
          role: ROLES.LAB_ADMIN,
        },
        {
          name: "Dr. Sarah Smith",
          email: "doctor@demodiagnostics.local",
          role: ROLES.DOCTOR,
        },
        {
          name: "John Receptionist",
          email: "receptionist@demodiagnostics.local",
          role: ROLES.RECEPTIONIST,
        },
      ];

      const staffPasswordHash = await bcrypt.hash(
        DEMO_STAFF_PASSWORD,
        env.BCRYPT_ROUNDS
      );

      for (const staff of demoStaffUsers) {
        const existingStaff = await User.findOne({ email: staff.email });
        if (!existingStaff) {
          await User.create({
            name: staff.name,
            email: staff.email,
            passwordHash: staffPasswordHash,
            role: staff.role,
            tenantId: demoLab._id,
            isActive: true,
          });
          logger.info({ email: staff.email, role: staff.role }, "Demo staff member created");
        } else {
          logger.info({ email: staff.email }, "Demo staff member already exists, skipping");
        }
      }

      // C. Seed Demo Patients (default 50 or custom targetCount)
      const receptionistUser = await User.findOne({
        email: "receptionist@demodiagnostics.local",
      });

      const patientCount = await Patient.countDocuments({
        tenantId: demoLab._id,
      });

      if (patientCount >= resolvedTargetCount) {
        logger.info(
          { count: patientCount, target: resolvedTargetCount },
          "Demo patients already seeded for Demo Diagnostics, skipping"
        );
      } else {
        const needed = resolvedTargetCount - patientCount;
        logger.info({ needed, target: resolvedTargetCount }, `Seeding ${needed} demo patients for Demo Diagnostics...`);

        const firstNames = [
          "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
          "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
          "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
          "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
          "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
          "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
          "Edward", "Deborah",
        ];

        const lastNames = [
          "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
          "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
          "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
          "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
          "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
          "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
          "Carter", "Roberts",
        ];

        const genders = ["MALE", "FEMALE", "OTHER"] as const;

        const BATCH_SIZE = 5000;
        const totalBatches = Math.ceil(needed / BATCH_SIZE);

        for (let b = 0; b < totalBatches; b++) {
          const batch = [];
          const currentBatchSize = Math.min(BATCH_SIZE, needed - b * BATCH_SIZE);

          for (let i = 0; i < currentBatchSize; i++) {
            const globalIdx = patientCount + b * BATCH_SIZE + i + 1;
            const firstName = firstNames[globalIdx % firstNames.length];
            const lastName = lastNames[globalIdx % lastNames.length];
            const gender = genders[globalIdx % genders.length];

            // Spread registrations across the last 30 days
            const daysAgo = globalIdx % 30;
            const registrationDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

            // Realistic birth year between 1955 and 2010
            const birthYear = 1955 + (globalIdx % 55);
            const birthMonth = globalIdx % 12;
            const birthDay = 1 + (globalIdx % 28);
            const dateOfBirth = new Date(birthYear, birthMonth, birthDay);

            batch.push({
              tenantId: demoLab._id,
              patientCode: `PT-${String(globalIdx).padStart(resolvedTargetCount > 9999 ? 6 : 4, "0")}`,
              name: `${firstName} ${lastName}`,
              phone: `+1-555-${String(1000000 + (globalIdx % 9000000))}`,
              gender,
              dateOfBirth,
              address: `${100 + (globalIdx % 500)} Health Avenue, Suite ${1 + (globalIdx % 50)}`,
              isActive: true,
              createdBy: receptionistUser?._id ?? null,
              updatedBy: receptionistUser?._id ?? null,
              createdAt: registrationDate,
              updatedAt: registrationDate,
            });
          }

          await Patient.insertMany(batch, { ordered: false });
        }

        logger.info({ count: resolvedTargetCount }, `Successfully seeded ${needed} demo patients`);
      }

      // Ensure Counter seq is at least resolvedTargetCount so next created patient starts sequentially
      await Counter.findOneAndUpdate(
        { tenantId: demoLab._id, key: "patientCode" },
        { $max: { seq: resolvedTargetCount }, $setOnInsert: { tenantId: demoLab._id, key: "patientCode" } },
        { upsert: true }
      );
    }

    logger.info("Database seeding completed successfully");
  } catch (error) {
    logger.error({ error }, "Database seeding failed");
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Execute directly if run as a script
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
