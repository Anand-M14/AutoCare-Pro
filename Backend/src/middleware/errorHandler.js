import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export const notFound = (req, _res, next) =>
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));

// Postgres / PostgREST codes we can safely translate.
const PG = {
  "23505": [409, "A record with the same unique value already exists"],
  "23503": [409, "This record is linked to other records and cannot be changed this way"],
  "23502": [400, "A required field is missing"],
  "23514": [400, "A value is not allowed for this field"],
  "22P02": [400, "A value has an invalid format"],
  "42703": [500, "Database schema is out of date. Run the SQL files in /migrations (see docs/SECURITY.md)"],
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let status = 500;
  let message = "Something went wrong";
  let details;

  if (err instanceof ApiError) {
    ({ status, message, details } = err);
  } else if (err?.type === "entity.parse.failed") {
    status = 400; message = "Malformed JSON body";
  } else if (err?.type === "entity.too.large") {
    status = 413; message = "Request body too large";
  } else if (err?.code && PG[err.code]) {
    [status, message] = PG[err.code];
  }

  if (status >= 500) {
    // Log the cause without request bodies, headers or secrets.
    console.error(`[error] ${req.method} ${req.path} ->`, err?.code || "", err?.message || err);
  }
  const body = { success: false, message };
  if (details) body.errors = details;
  if (status >= 500 && !env.isProd && err?.message && !(err instanceof ApiError)) body.debug = err.message;
  res.status(status).json(body);
};
