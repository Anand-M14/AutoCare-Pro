import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { ApiError } from "../utils/ApiError.js";
import { forceQueryIdentity, authorize } from "../middleware/authorize.js";
import { overview } from "../controllers/overviewController.js";
import { validate } from "../validators/validate.js";

// Mounted behind authenticate in app.js
const router = express.Router();

const ROLE_BY_SEGMENT = {
  admin: "Admin",
  manager: "Manager",
  advisor: "Service Advisor",
  technician: "Technician",
  customer: "Customer",
};

// A user may only open the dashboard of their own role (Admin may open any).
const dashboardAccess = (req, _res, next) => {
  const wanted = ROLE_BY_SEGMENT[String(req.params.role).toLowerCase()];
  if (!wanted) return next(ApiError.badRequest("Invalid Role"));
  if (req.user.role !== "Admin" && req.user.role !== wanted) return next(ApiError.forbidden());
  next();
};

// Real counts for the admin / manager dashboard (must be declared before "/:role").
router.get("/overview", authorize("Admin", "Manager"), validate({ range: { type: "enum", values: ["today", "7d", "30d"] } }, "query"), overview);

router.get(
  "/:role",
  dashboardAccess,
  // Non-admins always get their own data, whatever userId the client sends.
  forceQueryIdentity("userId", ["Manager", "Service Advisor", "Technician", "Customer"]),
  getDashboardData
);

export default router;
