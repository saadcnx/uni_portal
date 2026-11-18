import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Patient } from "../modules/patients/patient.model.js";
import { PatientService } from "../modules/patients/patient.service.js";
import { ROLES } from "../constants/roles.js";
import type { AuthUser } from "../types/express.d.js";

interface LatencySummary {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

interface ExplainStats {
  queryPlanner?: {
    winningPlan?: {
      stage?: string;
      inputStage?: {
        stage?: string;
        indexName?: string;
        inputStage?: {
          indexName?: string;
        };
      };
    };
  };
  executionStats: {
    executionTimeMillis: number;
    totalKeysExamined: number;
    totalDocsExamined: number;
    nReturned: number;
  };
}

function calculatePercentiles(latencies: number[]): LatencySummary {
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p: number) => {
    const idx = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
    );
    return sorted[idx];
  };

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;

  return {
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg,
    p50: Math.round(getP(50) * 100) / 100,
    p90: Math.round(getP(90) * 100) / 100,
    p95: Math.round(getP(95) * 100) / 100,
    p99: Math.round(getP(99) * 100) / 100,
  };
}

export async function runBenchmark(patientCount: number = 100000) {
  console.log(`\n======================================================`);
  console.log(`  STARTING 100,000 PATIENTS END-TO-END AUDIT`);
  console.log(`======================================================\n`);

  const mongod = await MongoMemoryServer.create({
    instance: { storageEngine: "wiredTiger" },
  });
  await mongoose.connect(mongod.getUri());
  console.log("Connected to in-memory MongoDB!");

  const tenantId = new mongoose.Types.ObjectId();
  const mockUser: AuthUser = {
    id: new mongoose.Types.ObjectId().toString(),
    role: ROLES.LAB_ADMIN,
    tenantId: tenantId.toString(),
    isSuperAdmin: false,
  };

  console.log("Ensuring database indexes...");
  await Patient.createIndexes();

  console.log(`Seeding ${patientCount} patient records for tenant ${tenantId}...`);
  const BATCH_SIZE = 5000;
  const firstNames = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  ];
  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  ];
  const genders = ["MALE", "FEMALE", "OTHER"] as const;

  const startTime = Date.now();
  for (let b = 0; b < Math.ceil(patientCount / BATCH_SIZE); b++) {
    const batch = [];
    const currentBatchSize = Math.min(BATCH_SIZE, patientCount - b * BATCH_SIZE);
    for (let i = 0; i < currentBatchSize; i++) {
      const globalIdx = b * BATCH_SIZE + i + 1;
      const fn = firstNames[globalIdx % firstNames.length];
      const ln = lastNames[globalIdx % lastNames.length];
      const daysAgo = globalIdx % 30;

      batch.push({
        tenantId,
        patientCode: `PT-${String(globalIdx).padStart(6, "0")}`,
        name: `${fn} ${ln}`,
        phone: `+1-555-${String(1000000 + (globalIdx % 9000000))}`,
        gender: genders[globalIdx % 3],
        dateOfBirth: new Date("1990-05-15"),
        address: `${100 + (globalIdx % 500)} Health Ave`,
        isActive: globalIdx % 100 !== 0, // 99% active, 1% inactive
        createdAt: new Date(Date.now() - daysAgo * 86400000),
        updatedAt: new Date(Date.now() - daysAgo * 86400000),
      });
    }
    await Patient.insertMany(batch, { ordered: false });
    process.stdout.write(`\rSeeded ${(b + 1) * BATCH_SIZE} / ${patientCount} patients...`);
  }
  console.log(`\nSeeded ${patientCount} records in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  const totalActive = await Patient.countDocuments({ tenantId, isActive: true });
  console.log(`Total active patients for benchmark tenant: ${totalActive}`);

  // ==========================================
  // 1. EXPLAIN EXECUTION STATS AUDIT
  // ==========================================
  console.log("\n--- EXPLAIN (executionStats) AUDIT ---");

  // A. List Query Explain
  const listExplain = (await Patient.find({ tenantId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .explain("executionStats")) as unknown as ExplainStats;

  const listWinningPlan = listExplain.queryPlanner?.winningPlan;
  const listExecution = listExplain.executionStats;

  console.log("\n[1] Patient List Query:");
  console.log(`  Query: { tenantId, isActive: true }.sort({ createdAt: -1 }).limit(20)`);
  console.log(`  Winning Plan Stage: ${listWinningPlan?.stage}`);
  console.log(`  Index Name: ${JSON.stringify(listWinningPlan?.inputStage?.inputStage?.indexName || listWinningPlan?.inputStage?.indexName || "IXSCAN")}`);
  console.log(`  Execution Time: ${listExecution.executionTimeMillis} ms`);
  console.log(`  Total Keys Examined: ${listExecution.totalKeysExamined}`);
  console.log(`  Total Docs Examined: ${listExecution.totalDocsExamined}`);
  console.log(`  Docs Returned: ${listExecution.nReturned}`);

  // B. Search by Name Explain
  const searchExplain = (await Patient.find({
    $or: [
      { tenantId, isActive: true, name: /^James/ },
      { tenantId, isActive: true, name: /^james/ },
      { tenantId, isActive: true, phone: /^\+1-555-1/ },
    ],
  })
    .limit(20)
    .explain("executionStats")) as unknown as ExplainStats;

  const searchWinningPlan = searchExplain.queryPlanner?.winningPlan;
  const searchExecution = searchExplain.executionStats;

  console.log("\n[2] Patient Search Query (Name/Phone Prefix):");
  console.log(`  Query: { $or: [{ name: /^James/ }, { name: /^james/ }, { phone: /^\\+1-555-1/ }] }.limit(20)`);
  console.log(`  Winning Plan Stage: ${searchWinningPlan?.stage}`);
  console.log(`  Execution Time: ${searchExecution.executionTimeMillis} ms`);
  console.log(`  Total Keys Examined: ${searchExecution.totalKeysExamined}`);
  console.log(`  Total Docs Examined: ${searchExecution.totalDocsExamined}`);
  console.log(`  Docs Returned: ${searchExecution.nReturned}`);

  // ==========================================
  // 2. SERVICE LATENCY BENCHMARK (100 ITERATIONS)
  // ==========================================
  console.log("\n--- SERVICE LATENCY BENCHMARK (100 ITERATIONS PER ENDPOINT) ---");

  // A. List Patients Service Call
  const listLatencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const page = 1 + (i % 10);
    const t0 = performance.now();
    await PatientService.listPatients({ page: String(page), limit: "20" }, mockUser);
    const t1 = performance.now();
    listLatencies.push(t1 - t0);
  }
  const listSummary = calculatePercentiles(listLatencies);
  console.log("\n[PatientService.listPatients] Latency (find + countDocuments):");
  console.log(`  Min: ${listSummary.min} ms`);
  console.log(`  Avg: ${listSummary.avg} ms`);
  console.log(`  p50: ${listSummary.p50} ms`);
  console.log(`  p90: ${listSummary.p90} ms`);
  console.log(`  p95: ${listSummary.p95} ms (Budget: < 200 ms -> ${listSummary.p95 < 200 ? "PASS" : "FAIL"})`);
  console.log(`  p99: ${listSummary.p99} ms`);
  console.log(`  Max: ${listSummary.max} ms`);

  // B. Search Patients Service Call
  const searchLatencies: number[] = [];
  const searchTerms = ["James", "Mary", "Smith", "+1-555-1", "John", "Davis", "William", "+1-555-2"];
  for (let i = 0; i < 100; i++) {
    const term = searchTerms[i % searchTerms.length];
    const t0 = performance.now();
    await PatientService.listPatients({ search: term, page: "1", limit: "20" }, mockUser);
    const t1 = performance.now();
    searchLatencies.push(t1 - t0);
  }
  const searchSummary = calculatePercentiles(searchLatencies);
  console.log("\n[PatientService.listPatients(search)] Latency (anchored prefix search + count):");
  console.log(`  Min: ${searchSummary.min} ms`);
  console.log(`  Avg: ${searchSummary.avg} ms`);
  console.log(`  p50: ${searchSummary.p50} ms`);
  console.log(`  p90: ${searchSummary.p90} ms`);
  console.log(`  p95: ${searchSummary.p95} ms (Budget: < 200 ms -> ${searchSummary.p95 < 200 ? "PASS" : "FAIL"})`);
  console.log(`  p99: ${searchSummary.p99} ms`);
  console.log(`  Max: ${searchSummary.max} ms`);

  await mongoose.disconnect();
  await mongod.stop();
  console.log("\nBenchmark finished successfully.");

  return {
    listExecution,
    searchExecution,
    listSummary,
    searchSummary,
  };
}

if (process.argv[1]?.endsWith("measure-queries.ts") || process.argv[1]?.endsWith("measure-queries.js")) {
  runBenchmark()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
