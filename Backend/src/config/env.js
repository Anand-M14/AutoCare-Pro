import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const missing = ["SUPABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_KEY) {
  missing.push("SUPABASE_KEY");
}
if (missing.length) {
  // Names only - never print values.
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}
if (!isTest && process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters. Run: npm run generate:secret");
}

const flag = (name, fallback) => {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : ["1", "true", "yes"].includes(v.toLowerCase());
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: Number(process.env.PORT) || 5000,
  supabaseUrl: process.env.SUPABASE_URL,
  // SUPABASE_SERVICE_ROLE_KEY is preferred once you switch keys (see docs/SECURITY.md);
  // until then the existing SUPABASE_KEY keeps working unchanged.
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",").map((s) => s.trim()).filter(Boolean),
  // Transition switches for the plain-text -> bcrypt migration.
  allowLegacyPlaintextLogin: flag("ALLOW_LEGACY_PLAINTEXT_LOGIN", true),
  autoUpgradeLegacyPasswords: flag("AUTO_UPGRADE_LEGACY_PASSWORDS", false),
  // Email (SendGrid). Without SENDGRID_API_KEY emails are skipped and logged as "skipped", never failed.
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",
  mailFrom: process.env.SENDGRID_FROM_EMAIL || "",
  mailFromName: process.env.SENDGRID_FROM_NAME || "AutoCare Pro",
  appUrl: (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
});
