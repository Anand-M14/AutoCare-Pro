import express from "express";
import { login, me, register, editProfile, changeMyPassword, forgotPassword, resetMyPassword } from "../controllers/authController.js";
import { validate } from "../validators/validate.js";
import { loginSchema, registerSchema, profileSchema, changePasswordSchema, forgotSchema, resetSchema } from "../validators/schemas.js";
import { rateLimit } from "../middleware/security.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

// 10 attempts / 15 min per IP+email
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}|${String(req.body?.email || "").toLowerCase()}`,
  message: "Too many login attempts. Please try again in a few minutes",
});

router.post("/login", loginLimiter, validate(loginSchema), login);
// 5 registrations / hour per IP
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many sign-ups from this network. Try again later" });
router.post("/register", registerLimiter, validate(registerSchema), register);
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, key: (req) => `${req.ip}|reset`, message: "Too many attempts. Try again later" });
router.post("/forgot-password", resetLimiter, validate(forgotSchema), forgotPassword);
router.post("/reset-password", resetLimiter, validate(resetSchema), resetMyPassword);

router.get("/me", authenticate, me);
router.put("/me", authenticate, validate(profileSchema), editProfile);
router.post("/change-password", authenticate, rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `${req.ip}|chg`, message: "Too many attempts. Try again later" }), validate(changePasswordSchema), changeMyPassword);

export default router;
