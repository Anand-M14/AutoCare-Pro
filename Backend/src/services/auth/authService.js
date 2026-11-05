import { ApiError } from "../../utils/ApiError.js";
import { verifyPassword, hashPassword, burnCompare } from "../../utils/password.js";
import { signToken } from "../../utils/token.js";
import { sanitizeUser } from "../../utils/sanitizeUser.js";
import { env } from "../../config/env.js";
import crypto from "node:crypto";
import { sendEmail } from "../email/emailService.js";

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const RESET_MINUTES = 30;
const friendlyConflict = (e) => (e?.code === "23505" ? ApiError.conflict("That phone number or email is already used by another account") : e);

export const loginWithPassword = async (store, email, password) => {
  const user = await store.findByEmail(email);
  if (!user) {
    await burnCompare(password);
    throw ApiError.unauthorized("Invalid email or password");
  }
  const { ok, legacy } = await verifyPassword(password, user);
  if (!ok) throw ApiError.unauthorized("Invalid email or password");
  if (String(user.status || "").toLowerCase() === "inactive") {
    throw ApiError.forbidden("Account is inactive. Please contact the administrator");
  }
  // Only writes when explicitly enabled (it modifies the user's row).
  if (legacy && env.autoUpgradeLegacyPasswords) {
    try { await store.setPasswordHash(user.id, await hashPassword(password)); }
    catch (e) { console.error("[auth] legacy password upgrade failed:", e?.code || e?.message); }
  }
  return { token: signToken(user), user: sanitizeUser(user), legacyPassword: legacy };
};

/** Public self-registration: the role is ALWAYS Customer, whatever the client sends. */
export const registerCustomer = async (store, input) => {
  if (await store.findByEmail(input.email)) throw ApiError.conflict("An account with this email already exists");
  const hash = await hashPassword(input.password);
  const row = await store.createCustomer({
    full_name: input.full_name, email: input.email, phone: input.phone,
    role: "Customer", status: "Active", password: hash, password_hash: hash,
  });
  void sendEmail("welcome", row.email, { name: row.full_name });
  return { token: signToken(row), user: sanitizeUser(row) };
};

export const updateProfile = async (store, id, patch) => {
  if (!Object.keys(patch).length) throw ApiError.badRequest("Nothing to update");
  try {
    const row = await store.update(id, patch);
    if (!row) throw ApiError.notFound("Account not found");
    return sanitizeUser(row);
  } catch (e) { throw friendlyConflict(e); }
};

const writePassword = (store, id, plain) =>
  hashPassword(plain).then((hash) => store.update(id, {
    password: hash, password_hash: hash, password_reset_token_hash: null, password_reset_expires: null,
  }));

export const changePassword = async (store, id, current, next) => {
  const user = await store.findById(id);
  if (!user) throw ApiError.notFound("Account not found");
  const { ok } = await verifyPassword(current, user);
  if (!ok) throw ApiError.badRequest("Your current password is not correct");
  if (current === next) throw ApiError.badRequest("Choose a password different from the current one");
  await writePassword(store, id, next);
  void sendEmail("passwordChanged", user.email, { name: user.full_name });
};

/** Always resolves, so the response never reveals whether an email has an account. */
export const requestPasswordReset = async (store, email) => {
  const user = await store.findByEmail(email);
  if (!user || String(user.status || "").toLowerCase() === "inactive") return;
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + RESET_MINUTES * 60000).toISOString();
  await store.update(user.id, { password_reset_token_hash: sha256(token), password_reset_expires: expires });
  void sendEmail("passwordReset", user.email, { name: user.full_name, url: `${env.appUrl}/reset-password?token=${token}` });
};

export const resetPassword = async (store, token, password) => {
  const user = await store.findByResetHash(sha256(token));
  const valid = user && user.password_reset_expires && new Date(user.password_reset_expires).getTime() > Date.now();
  if (!valid) throw ApiError.badRequest("This reset link is invalid or has expired. Request a new one");
  await writePassword(store, user.id, password);
  void sendEmail("passwordChanged", user.email, { name: user.full_name });
};
