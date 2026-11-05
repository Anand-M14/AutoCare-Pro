import express from "express";
import {
  getAllRequests, getSingleRequest, addRequest, updateRequest, deleteRequest, approve, reject,
} from "../controllers/requestController.js";
import { authorize } from "../middleware/authorize.js";
import { idParam, validate } from "../validators/validate.js";
import { ALL_STATUSES } from "../utils/workflow.js";
import { bookingSchema } from "../validators/schemas.js";

const listQuery = {
  page: { type: "int", min: 1, max: 1000000 },
  limit: { type: "int", min: 1, max: 100 },
  q: { type: "string", max: 80 },
  status: { type: "enum", values: ALL_STATUSES },
  sort: { type: "enum", values: ["created_at", "request_number", "request_status"] },
  dir: { type: "enum", values: ["asc", "desc"] },
};

// Mounted behind authenticate in app.js
const router = express.Router();

const viewers = authorize("Admin", "Manager", "Service Advisor", "Customer");

router.get("/", viewers, validate(listQuery, "query"), getAllRequests);
router.get("/:id", viewers, idParam(), getSingleRequest);
router.post("/", authorize("Admin", "Customer"), validate(bookingSchema), addRequest);
router.post("/:id/approve", authorize("Admin", "Manager"), idParam(), validate({ advisor_id: { type: "id", required: true } }), approve);
router.post("/:id/reject", authorize("Admin", "Manager"), idParam(), validate({ reason: { type: "string", min: 3, max: 500, required: true } }), reject);
router.put("/:id", authorize("Admin", "Manager"), idParam(), updateRequest);
router.delete("/:id", authorize("Admin"), idParam(), deleteRequest);

export default router;
