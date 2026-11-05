// Pure(ish) logic for the plain-text -> bcrypt migration. The Supabase client and the hash function are
// injected so this can be tested without a database. Nothing here ever logs a password, a hash or an email.
import { isBcryptHash } from "../../src/utils/password.js";

export const MAX_PAGE_SIZE = 1000; // Supabase/PostgREST default max rows per request

/**
 * Reads EVERY user in pages. Offsets advance by the number of rows actually received, so it stays correct
 * even if the server returns fewer rows than requested (a lower max-rows setting). The total is checked against
 * an exact count and the run aborts if they differ (e.g. a user was added mid-run) instead of continuing blind.
 */
export async function fetchAllUsers(client, { pageSize = MAX_PAGE_SIZE } = {}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new Error(`pageSize must be 1..${MAX_PAGE_SIZE}`);
  }
  const { count, error: countError } = await client.from("users").select("id", { count: "exact", head: true });
  if (countError) throw new Error(`Could not count users (${countError.code || "error"})`);
  if (typeof count !== "number") throw new Error("Could not determine the number of users; aborting");

  const rows = [];
  const seen = new Set();
  let pages = 0;
  while (rows.length < count) {
    const from = rows.length;
    const { data, error } = await client
      .from("users")
      .select("id, password, password_hash")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not read users at offset ${from} (${error.code || "error"})`);
    if (!data || data.length === 0) break;
    pages += 1;
    for (const r of data) {
      if (seen.has(r.id)) throw new Error("Duplicate user id returned while paging; data changed during the run. Retry.");
      seen.add(r.id);
      rows.push(r);
    }
  }
  if (rows.length !== count) {
    throw new Error(`Fetched ${rows.length} users but the table has ${count}. Nothing was changed. Retry when no users are being added.`);
  }
  // Second count: detects users added/removed while we were paging.
  const { count: after, error: afterError } = await client.from("users").select("id", { count: "exact", head: true });
  if (afterError || after !== count) {
    throw new Error("The number of users changed while reading. Nothing was changed. Retry when no users are being added.");
  }
  return { rows, count, pages };
}

export function planMigration(rows) {
  const alreadyMigrated = rows.filter((u) => isBcryptHash(u.password_hash));
  const pending = rows.filter((u) => !isBcryptHash(u.password_hash));
  return {
    total: rows.length,
    alreadyMigrated: alreadyMigrated.length,
    noPassword: pending.filter((u) => !u.password).length,
    toMigrate: pending.filter((u) => u.password),
  };
}

/** Hash + write one row at a time (concurrency-limited). Only rows whose password_hash is still NULL are updated. */
export async function applyMigration(client, toMigrate, { hash, concurrency = 4, now = () => new Date().toISOString(), onProgress } = {}) {
  const result = { migrated: 0, skipped: 0, failed: [] };
  let next = 0;
  const worker = async () => {
    while (next < toMigrate.length) {
      const u = toMigrate[next++];
      try {
        const h = isBcryptHash(u.password) ? u.password : await hash(u.password);
        const { data, error } = await client
          .from("users")
          .update({ password_hash: h, password_migrated_at: now() })
          .eq("id", u.id)
          .is("password_hash", null) // never overwrite a hash written by someone else meanwhile
          .select("id");
        if (error) result.failed.push({ id: u.id, code: error.code || "error" });
        else if (!data || data.length === 0) result.skipped += 1;
        else result.migrated += 1;
      } catch {
        result.failed.push({ id: u.id, code: "hash_error" });
      }
      const done = result.migrated + result.skipped + result.failed.length;
      if (onProgress && done % 100 === 0) onProgress(done, toMigrate.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, toMigrate.length) }, worker));
  return result;
}

export async function run(client, { apply = false, pageSize = MAX_PAGE_SIZE, hash, log = console.log } = {}) {
  const { rows, pages } = await fetchAllUsers(client, { pageSize });
  const plan = planMigration(rows);
  log(`Read ${plan.total} users in ${pages} page(s) of up to ${pageSize}.`);
  log(`Already migrated: ${plan.alreadyMigrated} | to migrate: ${plan.toMigrate.length} | no password set: ${plan.noPassword}`);
  if (!apply) {
    log("DRY RUN - nothing was changed.");
    return { plan, applied: null };
  }
  const applied = await applyMigration(client, plan.toMigrate, {
    hash,
    onProgress: (d, t) => log(`  progress ${d}/${t}`),
  });
  log(`Migrated ${applied.migrated}, skipped ${applied.skipped} (already changed), failed ${applied.failed.length}.`);
  for (const f of applied.failed) log(`  FAILED user id ${f.id} (${f.code})`);
  log("The plain-text `password` column was left untouched.");
  return { plan, applied };
}
