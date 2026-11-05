import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/token.js";
import { getUserStore } from "../services/auth/userStore.js";

/**
 * Verifies the Bearer JWT, then re-loads the user so that role changes,
 * deactivation and deletion take effect immediately (the role inside the token
 * is never trusted on its own).
 */
export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    const user = await getUserStore(req).findById(payload.sub ?? payload.id);
    if (!user) throw ApiError.unauthorized("Account no longer exists");
    if (String(user.status || "").toLowerCase() === "inactive") {
      throw ApiError.forbidden("Account is inactive");
    }
    req.user = { id: user.id, role: user.role, email: user.email, full_name: user.full_name };
    next();
  } catch (err) {
    next(err);
  }
};
