import express from "express";
import * as c from "../controllers/vehicleController.js";
import { authorize } from "../middleware/authorize.js";
import { idParam, validate } from "../validators/validate.js";
import { createVehicleSchema, updateVehicleSchema, listVehiclesQuery } from "../validators/schemas.js";

// Mounted behind authenticate. Customers only ever see / change their own vehicles (enforced in the controller).
const router = express.Router();
const readers = authorize("Admin", "Manager", "Service Advisor", "Customer");
const writers = authorize("Admin", "Service Advisor", "Customer");

router.get("/", readers, validate(listVehiclesQuery, "query"), c.list);
router.get("/:id", readers, idParam(), c.getOne);
router.get("/:id/history", readers, idParam(), c.history);
router.post("/", writers, validate(createVehicleSchema), c.create);
router.put("/:id", writers, idParam(), validate(updateVehicleSchema), c.update);
router.delete("/:id", authorize("Admin", "Customer"), idParam(), c.remove);

export default router;
