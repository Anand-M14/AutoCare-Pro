// Tells you what kind of key SUPABASE_KEY is, WITHOUT printing the key.
//   node scripts/check-supabase-key.js
import dotenv from "dotenv";
dotenv.config();

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const which = process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_KEY";
let type = "UNKNOWN";

if (!key) type = "MISSING";
else if (key.startsWith("sb_publishable_")) type = "PUBLISHABLE (anon-equivalent, safe for browsers, subject to RLS)";
else if (key.startsWith("sb_secret_")) type = "SECRET (service-role-equivalent, bypasses RLS, backend only)";
else if (key.split(".").length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role === "service_role") type = "LEGACY service_role JWT (bypasses RLS, backend only)";
    else if (payload.role === "anon") type = "LEGACY anon JWT (subject to RLS)";
    else type = `LEGACY JWT with role "${payload.role}"`;
  } catch { /* leave UNKNOWN */ }
}

console.log(`${which}: ${type}`);
console.log(type.startsWith("PUBLISHABLE") || type.startsWith("LEGACY anon")
  ? "=> Do NOT enable RLS yet: the backend would lose access. Switch to a secret/service_role key first."
  : type.startsWith("SECRET") || type.startsWith("LEGACY service_role")
    ? "=> Backend key bypasses RLS. It is safe to enable RLS once policies are prepared."
    : "=> Could not classify the key. Compare it with Project Settings > API Keys in Supabase.");
