import express from "express";
import cors from "cors";

import { corsOptions, securityHeaders } from "./middleware/security.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorize } from "./middleware/authorize.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import advisorRoutes from "./routes/advisorRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import technicianRoutes from "./routes/technicianRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));

  // Public
  app.get("/api/health", (_req, res) => res.json({ success: true, message: "AutoCare Pro API running" }));
  app.use("/api/auth", authRoutes); // /login is public, /me authenticates itself

  // Everything below requires a valid token; role rules are declared per mount/route.
  app.use("/api/dashboard", authenticate, dashboardRoutes);
  app.use("/api/users", authenticate, userRoutes);
  app.use("/api/requests", authenticate, requestRoutes);
  app.use("/api/vehicles", authenticate, vehicleRoutes);
  app.use("/api/manager", authenticate, authorize("Manager", "Admin"), managerRoutes);
  app.use("/api/advisor", authenticate, authorize("Service Advisor", "Admin"), advisorRoutes);
  app.use("/api/technician", authenticate, authorize("Technician"), technicianRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};

export default createApp();
