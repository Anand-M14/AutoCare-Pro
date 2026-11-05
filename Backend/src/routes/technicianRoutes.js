import express from "express";
import { notifyOnSuccess } from "../middleware/notify.js";
import { listMine, readReport } from "../controllers/technicianListController.js";
import { ownsRequest } from "../middleware/authorize.js";

import {
  startService,
  completeService,
  submitTechnicianReport
} from "../controllers/technicianController.js";

// Mounted behind authenticate + authorize("Technician") in app.js.
const router = express.Router();
const mine = ownsRequest("technician_id", ["Technician"], "technicianId");


router.get("/requests", listMine);
router.get("/requests/:requestId/report", mine, readReport);

// ==========================================
// START SERVICE
// PUT /api/technician/requests/:requestId/start
// ==========================================

router.put(
  "/requests/:requestId/start",
  mine,
  notifyOnSuccess("serviceStarted"),
  startService
);


// ==========================================
// COMPLETE SERVICE
// PUT /api/technician/requests/:requestId/complete
// ==========================================

router.put(
  "/requests/:requestId/complete",
  mine,
  notifyOnSuccess("serviceCompleted"),
  completeService
);


// ==========================================
// SUBMIT TECHNICIAN REPORT
// POST /api/technician/requests/:requestId/report
// ==========================================

router.post(
  "/requests/:requestId/report",
  mine,
  submitTechnicianReport
);


export default router;