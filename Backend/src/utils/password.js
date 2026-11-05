import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { env } from "../config/env.js";

export const BCRYPT_RE = /^\$2[aby]\$\d{2}\$.{53}$/;
export const isBcryptHash = (v) => typeof v === "string" && BCRYPT_RE.test(v);

export const hashPassword = (plain) => bcrypt.hash(plain, env.bcryptRounds);

// Valid hash used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 10);
export const burnCompare = (plain) => bcrypt.compare(plain, DUMMY_HASH);

const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

/**
 * Returns { ok, legacy }.
 *  - password_hash (bcrypt) is always preferred.
 *  - Legacy plain-text `password` is accepted only while ALLOW_LEGACY_PLAINTEXT_LOGIN=true
 *    and only for rows that have not been migrated yet.
 */
export const verifyPassword = async (plain, user) => {
  if (isBcryptHash(user.password_hash)) {
    return { ok: await bcrypt.compare(plain, user.password_hash), legacy: false };
  }
  if (isBcryptHash(user.password)) {
    return { ok: await bcrypt.compare(plain, user.password), legacy: false };
  }
  if (env.allowLegacyPlaintextLogin && typeof user.password === "string" && user.password) {
    return { ok: safeEqual(plain, user.password), legacy: true };
  }
  await burnCompare(plain);
  return { ok: false, legacy: false };
};
