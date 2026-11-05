import express from "express";
import { getOneUser, getAllUsers, addUser, updateUser, deleteUser } from "../controllers/userController.js";
import { validate, idParam } from "../validators/validate.js";
import { createUserSchema, updateUserSchema, listUsersQuery } from "../validators/schemas.js";
import { authorize } from "../middleware/authorize.js";

// Mounted behind authenticate in app.js. Reading: Admin (everyone) and Manager / Service Advisor (customers only).
// Writing: Admin only.
const router = express.Router();

router.get("/", authorize("Admin", "Manager", "Service Advisor"), validate(listUsersQuery, "query"), getAllUsers);
router.get("/:id", authorize("Admin", "Manager", "Service Advisor"), idParam(), getOneUser);
const adminOnly = authorize("Admin");
router.post("/", adminOnly, validate(createUserSchema), addUser);
router.put("/:id", adminOnly, idParam(), validate(updateUserSchema), updateUser);
router.delete("/:id", adminOnly, idParam(), deleteUser);

export default router;
