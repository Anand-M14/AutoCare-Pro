import { ApiError } from "../utils/ApiError.js";

const ROLES = ["Customer", "Manager", "Service Advisor", "Technician", "Admin"];
export const ROLE_VALUES = ROLES;
export const STATUS_VALUES = ["Active", "Inactive"];

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

const types = {
  string(v, r) {
    if (typeof v !== "string") throw "must be text";
    const s = v.replace(CONTROL, "").trim();
    if (s.length < (r.min ?? 1)) throw `must be at least ${r.min ?? 1} characters`;
    if (s.length > (r.max ?? 255)) throw `must be at most ${r.max ?? 255} characters`;
    return s;
  },
  email(v) {
    if (typeof v !== "string") throw "must be text";
    const s = v.trim().toLowerCase();
    if (s.length > 254 || !EMAIL.test(s)) throw "must be a valid email address";
    return s;
  },
  phone(v) {
    if (typeof v !== "string" && typeof v !== "number") throw "must be a phone number";
    const s = String(v).replace(/[\s()-]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(s)) throw "must be 7-15 digits (optional leading +)";
    return s;
  },
  id(v) {
    const s = String(v ?? "");
    if (!ID.test(s)) throw "is not a valid id";
    return s;
  },
  enum(v, r) {
    if (!r.values.includes(v)) throw `must be one of: ${r.values.join(", ")}`;
    return v;
  },
  password(v) {
    if (typeof v !== "string") throw "must be text";
    if (v.length < 8) throw "must be at least 8 characters";
    if (Buffer.byteLength(v) > 72) throw "must be at most 72 bytes";
    if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) throw "must contain a letter and a number";
    return v;
  },
  // Login only: do not apply strength rules to existing (legacy) passwords.
  anyPassword(v) {
    if (typeof v !== "string" || v.length < 1 || Buffer.byteLength(v) > 128) throw "is invalid";
    return v;
  },
  date(v) {
    const s = String(v ?? "");
    const d = new Date(`${s}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw "must be a date (YYYY-MM-DD)";
    return s;
  },
  time(v) {
    const s = String(v ?? "");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw "must be a time (HH:MM)";
    return s;
  },
  plate(v) {
    if (typeof v !== "string") throw "must be text";
    // Canonical form so "TN09AB4521", "tn 09-ab 4521" and "TN 09 AB 4521" are the same plate (the DB unique key cannot see through spacing).
    const compact = v.replace(CONTROL, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
    if (compact.length < 4 || compact.length > 20) throw "must be a valid registration number";
    const m = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/.exec(compact);
    return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : compact;
  },
  token(v) {
    if (typeof v !== "string" || !/^[A-Za-z0-9_-]{20,200}$/.test(v)) throw "is invalid";
    return v;
  },
  int(v, r) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < (r.min ?? 0) || n > (r.max ?? 1e9)) throw "must be a whole number in range";
    return n;
  },
};

/** Whitelists + validates `source` (body|query|params). Unknown keys are dropped. */
export const validate = (schema, source = "body") => (req, _res, next) => {
  const input = req[source] ?? {};
  const out = {};
  const errors = {};
  for (const [key, rule] of Object.entries(schema)) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") {
      if (rule.required) errors[key] = "is required";
      continue;
    }
    try {
      out[key] = types[rule.type](raw, rule);
    } catch (msg) {
      if (typeof msg !== "string") throw msg;
      errors[key] = msg;
    }
  }
  if (Object.keys(errors).length) {
    return next(ApiError.badRequest("Validation failed", errors));
  }
  req.valid = { ...(req.valid || {}), [source]: out };
  next();
};

export const idParam = (name = "id") => validate({ [name]: { type: "id", required: true } }, "params");
