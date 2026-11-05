import express from "express";
import { forceBodyIdentity } from "../middleware/authorize.js";

import {
  managerRequests,
  managerAdvisors,
  assignAdvisorToRequest,
  managerReports,
  approveReport
} from "../controllers/managerController.js";


const router =
  express.Router();


// =====================================================
// REQUESTS
// =====================================================

router.get(
  "/requests",
  managerRequests
);


// =====================================================
// ADVISORS
// =====================================================

router.get(
  "/advisors",
  managerAdvisors
);


// =====================================================
// ASSIGN ADVISOR
// =====================================================

router.put(
  "/assign-advisor/:requestId",
  assignAdvisorToRequest
);


// =====================================================
// MANAGER REPORTS
// =====================================================

router.get(
  "/reports",
  managerReports
);


// =====================================================
// APPROVE REPORT
// =====================================================

// Mounted behind authenticate + authorize("Manager","Admin") in app.js
router.put(
  "/reports/:requestId/approve",
  forceBodyIdentity("managerId", ["Manager"]),
  approveReport
);


export default router;