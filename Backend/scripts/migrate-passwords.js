// Hashes legacy plain-text passwords into users.password_hash (bcrypt).
//
//   node scripts/migrate-passwords.js                                   -> DRY RUN (default): changes nothing
//   node scripts/migrate-passwords.js --apply --i-have-a-backup         -> writes password_hash for unmigrated users
//   options: --page-size=N (1..1000, default 1000)
//
// - Reads ALL users with pagination (works for more than 1,000 users) and verifies the total against a count.
// - Only rows where password_hash IS NULL are touched; the plain-text `password` column is NOT modified or dropped.
// - Passwords, hashes and emails are never printed (users are identified by id only).
import "../src/config/env.js";
import supabase from "../src/config/supabase.js";
import { hashPassword } from "../src/utils/password.js";
import { run, MAX_PAGE_SIZE } from "./lib/passwordMigration.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const sizeArg = args.find((a) => a.startsWith("--page-size="));
const pageSize = sizeArg ? Number(sizeArg.split("=")[1]) : MAX_PAGE_SIZE;

if (apply && !args.includes("--i-have-a-backup")) {
  console.error("Refusing to write: run migrations/000_backup_and_verify.sql, confirm verify_backup() shows ok = true, then add --i-have-a-backup.");
  process.exit(1);
}

try {
  await run(supabase, { apply, pageSize, hash: hashPassword });
} catch (e) {
  console.error(`Stopped: ${e.message}`);
  console.error("If the error mentions a missing column, run migrations/001_stage1_security.sql first.");
  process.exit(1);
}
