import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  escapeRegex,
  MAX_LIMIT,
  paginate,
  parsePaginationParams,
  prefixRegex,
  prefixSearch,
} from "../src/utils/paginate.js";

describe("Pagination Utility - Regex & Search Sanitization", () => {
  it("escapes special regex characters to prevent regex injection", () => {
    const maliciousInput = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(maliciousInput);

    expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    // Ensure escaped regex compiles and matches literal characters, not regex wildcards
    const regex = new RegExp(escaped);
    expect(regex.test(".*+?^${}()|[]\\")).toBe(true);
    expect(regex.test("arbitrary text")).toBe(false);
  });

  it("creates anchored prefix regex with case insensitivity", () => {
    const regex = prefixRegex("Ali");
    expect(regex.source).toBe("^Ali");
    expect(regex.flags).toContain("i");

    expect(regex.test("Alice")).toBe(true);
    expect(regex.test("ali")).toBe(true);
    expect(regex.test("Bob Alice")).toBe(false); // Must be anchored to prefix
  });

  it("builds prefix search query on single and multiple fields", () => {
    const singleField = prefixSearch<{ name: string }>("name", "test");
    expect(singleField).toEqual({ name: /^test/i });

    const multiField = prefixSearch<{ name: string; phone: string }>(["name", "phone"], "0300");
    expect(multiField).toEqual({
      $or: [{ name: /^0300/i }, { phone: /^0300/i }],
    });
  });
});

describe("Pagination Utility - Parameters and Limits", () => {
  it("applies default page and limit when not provided", () => {
    const params = parsePaginationParams();
    expect(params.page).toBe(DEFAULT_PAGE); // 1
    expect(params.limit).toBe(DEFAULT_LIMIT); // 20
    expect(params.skip).toBe(0);
  });

  it("handles string numbers correctly", () => {
    const params = parsePaginationParams({ page: "3", limit: "25" });
    expect(params.page).toBe(3);
    expect(params.limit).toBe(25);
    expect(params.skip).toBe(50);
  });

  it("caps limit to MAX_LIMIT (100) when oversized limit is requested", () => {
    const params = parsePaginationParams({ limit: 500 });
    expect(params.limit).toBe(MAX_LIMIT); // 100
  });

  it("enforces minimum bounds on page and limit", () => {
    const params = parsePaginationParams({ page: -5, limit: -10 });
    expect(params.page).toBe(1);
    expect(params.limit).toBe(1);
    expect(params.skip).toBe(0);
  });

  it("handles invalid non-numeric inputs gracefully", () => {
    const params = parsePaginationParams({ page: "invalid" as unknown as number, limit: "abc" as unknown as number });
    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
    expect(params.skip).toBe(0);
  });
});

describe("paginate() Mongoose Execution", () => {
  it("runs find and countDocuments in parallel and calculates meta correctly", async () => {
    const mockData = [{ id: "1", name: "Patient 1" }, { id: "2", name: "Patient 2" }];
    const totalCount = 45;

    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockData),
    };

    const mockModel = {
      find: vi.fn().mockReturnValue(mockQuery),
      countDocuments: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(totalCount),
      }),
    };

    const result = await paginate(
      mockModel as unknown as import("mongoose").Model<{ id: string; name: string }>,
      { isActive: true },
      { page: 2, limit: 20, sort: "-createdAt" }
    );

    expect(mockModel.find).toHaveBeenCalledWith({ isActive: true });
    expect(mockQuery.sort).toHaveBeenCalledWith("-createdAt");
    expect(mockQuery.skip).toHaveBeenCalledWith(20);
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
    expect(mockQuery.lean).toHaveBeenCalled();
    expect(mockModel.countDocuments).toHaveBeenCalledWith({ isActive: true });

    expect(result.data).toEqual(mockData);
    expect(result.meta).toEqual({
      total: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it("returns totalPages 0 when total count is 0", async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      find: vi.fn().mockReturnValue(mockQuery),
      countDocuments: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      }),
    };

    const result = await paginate(mockModel as unknown as import("mongoose").Model<{ id: string; name: string }>);

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });
});
