import express from "express";
import { notifyOnSuccess } from "../middleware/notify.js";
import { vehicleReady, handedOver } from "../controllers/finalStepController.js";
import { forceQueryIdentity, ownsRequest } from "../middleware/authorize.js";

import {
  advisorReports,
  verifyReport,

  // REQUESTS
  advisorRequests,
  advisorTechnicians,
  assignTechnician
} from "../controllers/advisorController.js";

// Mounted behind authenticate + authorize("Service Advisor","Admin") in app.js.
// A Service Advisor can only ever see / act on their own work.
const router = express.Router();
const asSelf = forceQueryIdentity("advisorId", ["Service Advisor"]);

// =====================================================
// GET ADVISOR REQUESTS
// GET /api/advisor/requests?advisorId=UUID
// =====================================================

router.get(
  "/requests",
  asSelf,
  advisorRequests
);

// =====================================================
// GET TECHNICIANS
// GET /api/advisor/technicians
// =====================================================

router.get(
  "/technicians",
  advisorTechnicians
);

// =====================================================
// ASSIGN TECHNICIAN
// PUT /api/advisor/assign-technician/:requestId
// =====================================================

router.put(
  "/assign-technician/:requestId",
  ownsRequest("advisor_id", ["Service Advisor"]),
  notifyOnSuccess("technicianAssigned"),
  assignTechnician
);

// =====================================================
// GET TECHNICIAN REPORTS FOR ADVISOR
// GET /api/advisor/reports?advisorId=UUID
// =====================================================

router.get(
  "/reports",
  asSelf,
  advisorReports
);

// =====================================================
// VERIFY TECHNICIAN REPORT
// PUT /api/advisor/reports/:requestId/verify
// =====================================================

router.put(
  "/reports/:requestId/verify",
  ownsRequest("advisor_id", ["Service Advisor"], "advisorId"),
  verifyReport
);

// Final steps (manager approval -> pickup -> handover)
router.put("/requests/:requestId/vehicle-ready", ownsRequest("advisor_id", ["Service Advisor"]), notifyOnSuccess("vehicleReady"), vehicleReady);
router.put("/requests/:requestId/complete", ownsRequest("advisor_id", ["Service Advisor"]), notifyOnSuccess("completed"), handedOver);

export default router;