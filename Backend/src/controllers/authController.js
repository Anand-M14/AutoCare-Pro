import { loginWithPassword, registerCustomer, updateProfile, changePassword, requestPasswordReset, resetPassword } from "../services/auth/authService.js";
import { getUserStore } from "../services/auth/userStore.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.valid.body;
    const { token, user } = await loginWithPassword(getUserStore(req), email, password);
    res.json({ success: true, message: "Login Success", token, user });
  } catch (err) { next(err); }
};

export const me = async (req, res, next) => {
  try {
    const user = await getUserStore(req).findById(req.user.id);
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) { next(err); }
};

export const register = async (req, res, next) => {
  try {
    const { token, user } = await registerCustomer(getUserStore(req), req.valid.body);
    res.status(201).json({ success: true, message: "Account created", token, user });
  } catch (err) { next(err); }
};

export const editProfile = async (req, res, next) => {
  try {
    const user = await updateProfile(getUserStore(req), req.user.id, req.valid.body);
    res.json({ success: true, message: "Profile updated", data: user });
  } catch (err) { next(err); }
};

export const changeMyPassword = async (req, res, next) => {
  try {
    await changePassword(getUserStore(req), req.user.id, req.valid.body.current_password, req.valid.body.new_password);
    res.json({ success: true, message: "Password changed" });
  } catch (err) { next(err); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await requestPasswordReset(getUserStore(req), req.valid.body.email);
    res.json({ success: true, message: "If that email has an account, a reset link is on its way." });
  } catch (err) { next(err); }
};

export const resetMyPassword = async (req, res, next) => {
  try {
    await resetPassword(getUserStore(req), req.valid.body.token, req.valid.body.password);
    res.json({ success: true, message: "Password updated. You can sign in now." });
  } catch (err) { next(err); }
};
