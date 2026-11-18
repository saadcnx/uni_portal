import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Schema } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ROLES } from "../src/constants/roles.js";
import { runWithTenant } from "../src/context/tenantContext.js";
import { tenantPlugin } from "../src/plugins/tenant.plugin.js";

interface ITestItem {
  title: string;
  tenantId?: mongoose.Types.ObjectId | null;
}

const TestItemSchema = new Schema<ITestItem>({
  title: { type: String, required: true },
});
TestItemSchema.plugin(tenantPlugin);

const TestItemModel = mongoose.model<ITestItem>("TestItem", TestItemSchema);

describe("Mongoose Multi-Tenant Plugin Isolation", () => {
  let mongod: MongoMemoryServer;

  const tenantA = new mongoose.Types.ObjectId().toString();
  const tenantB = new mongoose.Types.ObjectId().toString();

  const userAContext = {
    tenantId: tenantA,
    userId: "user_a_123",
    role: ROLES.LAB_ADMIN,
    isSuperAdmin: false,
  };

  const userBContext = {
    tenantId: tenantB,
    userId: "user_b_456",
    role: ROLES.LAB_ADMIN,
    isSuperAdmin: false,
  };

  const superAdminContext = {
    tenantId: null,
    userId: "super_admin_789",
    role: ROLES.SUPER_ADMIN,
    isSuperAdmin: true,
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }, 600000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }, 30000);

  beforeEach(async () => {
    // Clear throwaway collection before each test
    await TestItemModel.deleteMany({});

    // Seed baseline items without tenant context (simulating platform seed)
    await TestItemModel.create([
      { title: "Item A1", tenantId: new mongoose.Types.ObjectId(tenantA) },
      { title: "Item A2", tenantId: new mongoose.Types.ObjectId(tenantA) },
      { title: "Item B1", tenantId: new mongoose.Types.ObjectId(tenantB) },
    ]);
  });

  it("proves find and findOne only return records belonging to the active tenant", async () => {
    await runWithTenant(userAContext, async () => {
      const items = await TestItemModel.find();
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.title)).toEqual(expect.arrayContaining(["Item A1", "Item A2"]));

      // Direct query for another tenant's record returns null
      const itemB = await TestItemModel.findOne({ title: "Item B1" });
      expect(itemB).toBeNull();
    });

    await runWithTenant(userBContext, async () => {
      const items = await TestItemModel.find();
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Item B1");
    });
  });

  it("proves countDocuments is strictly scoped to the active tenant", async () => {
    await runWithTenant(userAContext, async () => {
      const count = await TestItemModel.countDocuments();
      expect(count).toBe(2);
    });

    await runWithTenant(userBContext, async () => {
      const count = await TestItemModel.countDocuments();
      expect(count).toBe(1);
    });
  });

  it("proves updateOne, updateMany and findOneAndUpdate cannot modify another tenant's records", async () => {
    await runWithTenant(userAContext, async () => {
      // Attempt to modify tenant B's record
      const updateResult = await TestItemModel.updateOne(
        { title: "Item B1" },
        { title: "Tampered Item B1" }
      );
      expect(updateResult.matchedCount).toBe(0);
      expect(updateResult.modifiedCount).toBe(0);

      // Attempt findOneAndUpdate on tenant B's record
      const findAndUpdateResult = await TestItemModel.findOneAndUpdate(
        { title: "Item B1" },
        { title: "Tampered Item B1" }
      );
      expect(findAndUpdateResult).toBeNull();

      // Successfully updates own record
      const ownUpdate = await TestItemModel.updateOne(
        { title: "Item A1" },
        { title: "Updated Item A1" }
      );
      expect(ownUpdate.matchedCount).toBe(1);
      expect(ownUpdate.modifiedCount).toBe(1);
    });

    // Verify tenant B's record was never altered
    const itemB1 = await TestItemModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantB),
    });
    expect(itemB1?.title).toBe("Item B1");
  });

  it("proves deleteOne cannot delete another tenant's records", async () => {
    await runWithTenant(userAContext, async () => {
      // Attempt to delete tenant B's record
      const deleteResult = await TestItemModel.deleteOne({ title: "Item B1" });
      expect(deleteResult.deletedCount).toBe(0);

      // Successfully deletes own record
      const ownDelete = await TestItemModel.deleteOne({ title: "Item A1" });
      expect(ownDelete.deletedCount).toBe(1);
    });

    // Confirm tenant B item still exists in database
    const itemB1 = await TestItemModel.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantB),
    });
    expect(itemB1).not.toBeNull();
  });

  it("proves aggregate pipelines automatically prepend a $match for the active tenant", async () => {
    await runWithTenant(userAContext, async () => {
      const results = await TestItemModel.aggregate([
        { $project: { title: 1, tenantId: 1 } },
      ]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.tenantId.toString() === tenantA)).toBe(true);
    });
  });

  it("proves super admin bypasses tenant filtering across queries and aggregations", async () => {
    await runWithTenant(superAdminContext, async () => {
      const allItems = await TestItemModel.find();
      expect(allItems).toHaveLength(3);

      const totalCount = await TestItemModel.countDocuments();
      expect(totalCount).toBe(3);

      const aggResults = await TestItemModel.aggregate([
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      expect(aggResults[0].count).toBe(3);
    });
  });

  it("proves queries without tenant context bypass filtering", async () => {
    // Calling without runWithTenant (e.g. system background / seed job)
    const items = await TestItemModel.find();
    expect(items).toHaveLength(3);

    const count = await TestItemModel.countDocuments();
    expect(count).toBe(3);
  });

  it("proves tenantId is automatically assigned on document save", async () => {
    await runWithTenant(userAContext, async () => {
      const newItem = new TestItemModel({ title: "Newly Registered Item" });
      await newItem.save();

      expect(newItem.tenantId).toBeDefined();
      expect(newItem.tenantId?.toString()).toBe(tenantA);
    });
  });
});
