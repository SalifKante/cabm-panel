// src/utils/queryBuilder.js
//
// Reusable helpers for paginated, searchable, filterable list endpoints.
// Used by public list routes (products, and later activities / orders / blog)
// to keep pagination + search behaviour and response shapes consistent.

/**
 * Parse & clamp pagination params from a request query object.
 *
 * @param {object} query                request query (req.query)
 * @param {object} [opts]
 * @param {number} [opts.defaultLimit]  page size when none/invalid provided
 * @param {number} [opts.maxLimit]      hard upper bound on page size
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function getPagination(query = {}, { defaultLimit = 12, maxLimit = 100 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a case-insensitive regex OR filter across the given fields.
 * Escapes regex metacharacters so user input is treated literally.
 * Returns {} when no search term (so it can be safely spread/merged).
 *
 * @param {string} term      raw search term (e.g. req.query.q)
 * @param {string[]} fields  document fields to search across
 * @returns {object}         a Mongoose filter fragment
 */
export function buildSearchFilter(term, fields = []) {
  const q = (term ?? "").toString().trim();
  if (!q || fields.length === 0) return {};

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = { $regex: escaped, $options: "i" };
  return { $or: fields.map((field) => ({ [field]: rx })) };
}

/**
 * Build the standard pagination metadata object returned to clients.
 *
 * @param {object} args
 * @param {number} args.total  total documents matching the filter
 * @param {number} args.page   current page (1-based)
 * @param {number} args.limit  page size
 * @returns {object}
 */
export function buildPaginationMeta({ total, page, limit }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    total,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

/**
 * Run a paginated find against a Mongoose model and return items + meta.
 *
 * @param {import('mongoose').Model} model
 * @param {object} opts
 * @param {object} [opts.filter]  Mongoose filter
 * @param {object} [opts.sort]    Mongoose sort
 * @param {number} opts.page
 * @param {number} opts.limit
 * @param {number} opts.skip
 * @param {boolean} [opts.lean]   return plain objects (default true)
 * @returns {Promise<{ items: any[], pagination: object }>}
 */
export async function paginate(
  model,
  { filter = {}, sort = { createdAt: -1 }, page, limit, skip, lean = true } = {}
) {
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).lean(lean),
    model.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta({ total, page, limit }) };
}
