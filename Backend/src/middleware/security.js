import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const securityHeaders = (_req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (env.isProd) res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
};

/** Small in-memory fixed-window limiter (per process). */
export const rateLimit = ({ windowMs, max, key = (req) => req.ip, message }) => {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  timer.unref();
  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let rec = hits.get(k);
    if (!rec || rec.reset <= now) rec = { count: 0, reset: now + windowMs };
    rec.count += 1;
    hits.set(k, rec);
    if (rec.count > max) {
      res.setHeader("Retry-After", Math.ceil((rec.reset - now) / 1000));
      return next(new ApiError(429, message || "Too many requests, please try again later"));
    }
    next();
  };
};

export const corsOptions = {
  origin(origin, cb) {
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    cb(new ApiError(403, "Origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
};
