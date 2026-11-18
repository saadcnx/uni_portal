import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Patient } from "../src/modules/patients/patient.model.js";
import { prefixRegex } from "../src/utils/paginate.js";
import { createTestDatabase, type TestDatabase } from "./helpers/index.js";

describe("Index Coverage & Query Execution Plan Audit", () => {
  let db: TestDatabase;
  const tenantId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    db = await createTestDatabase();
    await Patient.createIndexes();

    // Insert 10 test documents so index stats are realistic
    const patients = [];
    for (let i = 1; i <= 10; i++) {
      patients.push({
        tenantId,
        patientCode: `PT-000${i}`,
        name: `Patient ${i}`,
        phone: `+1555000${i}`,
        gender: "FEMALE",
        dateOfBirth: new Date("1995-01-01"),
        isActive: true,
      });
    }
    await Patient.insertMany(patients);
  }, 60000);

  afterAll(async () => {
    await db.stop();
  }, 30000);

  it("patient list query uses index and never performs a collection scan", async () => {
    const explainResult = (await Patient.find({
      tenantId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats")) as unknown as {
      queryPlanner: {
        winningPlan: {
          stage?: string;
          inputStage?: { stage?: string; indexName?: string; inputStage?: { stage?: string; indexName?: string } };
        };
      };
      executionStats: {
        totalDocsExamined: number;
        nReturned: number;
      };
    };

    const planJson = JSON.stringify(explainResult.queryPlanner.winningPlan);

    // Verify index scan is used
    expect(planJson).toContain('"stage":"IXSCAN"');

    // Verify NO collection scan (COLLSCAN) is performed in the winning plan
    expect(planJson).not.toContain('"stage":"COLLSCAN"');
  });

  it("patient search query by name or phone uses index coverage without collection scan", async () => {
    const regex = prefixRegex("Patient");
    const explainResult = (await Patient.find({
      tenantId,
      isActive: true,
      $or: [{ name: regex }, { phone: regex }],
    })
      .limit(20)
      .explain("executionStats")) as unknown as {
      queryPlanner: {
        winningPlan: Record<string, unknown>;
      };
      executionStats: {
        totalDocsExamined: number;
        nReturned: number;
      };
    };

    const planJson = JSON.stringify(explainResult.queryPlanner.winningPlan);

    // Verify index scan is used
    expect(planJson).toContain('"stage":"IXSCAN"');

    // Verify NO collection scan (COLLSCAN) is performed in the winning plan
    expect(planJson).not.toContain('"stage":"COLLSCAN"');
  });
});
