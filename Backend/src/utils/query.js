// Helpers for list endpoints: pagination, safe search text, response meta.
export const clampInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
};

export const parsePage = (q = {}, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = clampInt(q.page, 1, 1, 1_000_000);
  const limit = clampInt(q.limit, defaultLimit, 1, maxLimit);
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
};

/**
 * Makes free text safe to embed in a PostgREST `or=(...)` / ilike filter:
 * removes the characters that carry meaning there (, ( ) * % \ ") so user input cannot add filters.
 */
export const cleanSearch = (s) =>
  String(s ?? "").replace(/[,()*%\\"':;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export const pageMeta = ({ page, limit }, total) => ({
  page, limit, total, pages: Math.max(1, Math.ceil(total / limit)),
});
