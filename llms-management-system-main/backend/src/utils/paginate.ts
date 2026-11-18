import type { Model } from "mongoose";

// ModelFilter represents Mongoose query filter conditions
export type ModelFilter<T = Record<string, unknown>> = Record<string, unknown> & {
  [K in keyof T]?: unknown;
};

export interface PaginateOptions {
  page?: number | string;
  limit?: number | string;
  sort?: Record<string, 1 | -1 | "asc" | "desc"> | string;
  select?: string | Record<string, number | boolean>;
}

export interface PaginateResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Escapes special regex characters to prevent regex injection attacks.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates an anchored, case-insensitive, escaped regex for prefix searching.
 * Anchoring to start (^) allows database indexes to be used effectively.
 */
export function prefixRegex(text: string): RegExp {
  return new RegExp(`^${escapeRegex(text)}`, "i");
}

/**
 * Helper to build an anchored prefix search filter on a given field or multiple fields ($or).
 */
export function prefixSearch<T>(
  fieldOrFields: keyof T | (keyof T)[],
  searchTerm: string
): ModelFilter<T> {
  const regex = prefixRegex(searchTerm);
  if (Array.isArray(fieldOrFields)) {
    return {
      $or: fieldOrFields.map((f) => ({ [f]: regex })),
    } as ModelFilter<T>;
  }
  return { [fieldOrFields]: regex } as ModelFilter<T>;
}

/**
 * Parses and sanitizes pagination parameters.
 * - Defaults: page 1, limit 20
 * - Capped: limit max 100, page min 1
 */
export function parsePaginationParams(options: PaginateOptions = {}): {
  page: number;
  limit: number;
  skip: number;
} {
  const rawPage = typeof options.page === "string" ? parseInt(options.page, 10) : options.page;
  const rawLimit = typeof options.limit === "string" ? parseInt(options.limit, 10) : options.limit;

  const page = Math.max(1, !rawPage || isNaN(rawPage) ? DEFAULT_PAGE : rawPage);
  const parsedLimit = !rawLimit || isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parsedLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Paginate helper for Mongoose models.
 * Runs find and countDocuments in parallel with Promise.all, uses lean(),
 * caps limit at 100, defaults to page 1 and limit 20.
 */
export async function paginate<T>(
  model: Model<T>,
  filter: ModelFilter<T> = {},
  options: PaginateOptions = {}
): Promise<PaginateResult<T>> {
  const { page, limit, skip } = parsePaginationParams(options);

  const query = model.find(filter);

  if (options.sort) {
    // Mongoose query sort expects string or sort order mapping
    query.sort(options.sort as string | Record<string, 1 | -1 | "asc" | "desc">);
  }

  if (options.select) {
    query.select(options.select);
  }

  query.skip(skip).limit(limit).lean();

  const [data, total] = await Promise.all([
    query.exec(),
    model.countDocuments(filter).exec(),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data: data as unknown as T[],
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
