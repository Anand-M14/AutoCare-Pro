import { ApiError } from "../utils/ApiError.js";
import supabase from "../config/supabase.js";

/** authorize("Admin", "Manager") - role names match users_role_check exactly. */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

/**
 * Ownership guard for /:requestId routes. Roles listed in `enforceFor` must be
 * the assigned person on the request (column = advisor_id | technician_id); other
 * roles pass through. The acting user id is also forced into the body/query so a
 * client can never act "as" someone else.
 */
export const ownsRequest = (column, enforceFor, bodyKey) => async (req, _res, next) => {
  try {
    if (enforceFor.includes(req.user.role)) {
      const { data, error } = await supabase
        .from("service_requests").select(`id, ${column}`).eq("id", req.params.requestId).maybeSingle();
      if (error) throw error;
      if (!data) throw ApiError.notFound("Service request not found");
      if (String(data[column]) !== String(req.user.id)) {
        throw ApiError.forbidden("This request is not assigned to you");
      }
      if (bodyKey) req.body = { ...(req.body || {}), [bodyKey]: req.user.id };
    }
    next();
  } catch (err) {
    next(err);
  }
};

/** Forces ?key=<current user id> for the listed roles (Express 5 query is read-only). */
export const forceQueryIdentity = (key, roles) => (req, _res, next) => {
  if (roles.includes(req.user.role)) {
    Object.defineProperty(req, "query", {
      value: { ...req.query, [key]: String(req.user.id) },
      writable: true, configurable: true, enumerable: true,
    });
  }
  next();
};

export const forceBodyIdentity = (key, roles) => (req, _res, next) => {
  if (roles.includes(req.user.role)) req.body = { ...(req.body || {}), [key]: req.user.id };
  next();
};
