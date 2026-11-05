import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_KEY = "test-key";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.BCRYPT_ROUNDS = "4";

const { run, fetchAllUsers, MAX_PAGE_SIZE } = await import("../scripts/lib/passwordMigration.js");
const { hashPassword, isBcryptHash } = await import("../src/utils/password.js");

/** In-memory stand-in for the Supabase client with a server-side max-rows cap. */
function fakeClient(rows, { maxRows = 1000, failUpdateFor = new Set(), onRead } = {}) {
  const calls = { ranges: [], updates: 0 };
  const builder = (table) => {
    const st = { op: "select", head: false, count: null, order: null, range: null, patch: null, filters: [], returning: false };
    const api = {
      select(_cols, opts = {}) { if (st.op === "update") st.returning = true; else { st.head = !!opts.head; st.count = opts.count || null; } return api; },
      order() { st.order = true; return api; },
      range(a, b) { st.range = [a, b]; return api; },
      update(p) { st.op = "update"; st.patch = p; return api; },
      eq(c, v) { st.filters.push((r) => r[c] === v); return api; },
      is(c, v) { st.filters.push((r) => r[c] === v); return api; },
      then(res, rej) {
        return Promise.resolve().then(() => {
          assert.equal(table, "users");
          if (st.op === "select") {
            if (st.head) return { count: rows.length, data: null, error: null };
            const [a, b] = st.range;
            onRead?.(a); // lets a test mutate the table "mid-run"
            const sorted = [...rows].sort((x, y) => (x.id < y.id ? -1 : 1));
            const n = Math.min(b - a + 1, maxRows);
            calls.ranges.push([a, b]);
            return { data: sorted.slice(a, a + n).map(({ id, password, password_hash }) => ({ id, password, password_hash })), error: null };
          }
          calls.updates += 1;
          const target = rows.filter((r) => st.filters.every((f) => f(r)));
          if (target.some((r) => failUpdateFor.has(r.id))) return { data: null, error: { code: "XX000" } };
          target.forEach((r) => Object.assign(r, st.patch));
          return { data: target.map((r) => ({ id: r.id })), error: null };
        }).then(res, rej);
      },
    };
    return api;
  };
  return { from: builder, calls };
}

const makeUsers = (n) => Array.from({ length: n }, (_, i) => ({
  id: `id-${String(i).padStart(6, "0")}`,
  email: `user${i}@example.com`,
  password: `Secret#${i}-plain`,
  password_hash: null,
}));

const capture = () => { const lines = []; return { lines, log: (s) => lines.push(String(s)) }; };

test("reads more than 1,000 users across pages and dry-run changes nothing", async () => {
  const rows = makeUsers(2500);
  const c = fakeClient(rows);
  const out = capture();
  const { plan, applied } = await run(c, { apply: false, hash: hashPassword, log: out.log });
  assert.equal(plan.total, 2500);
  assert.equal(plan.toMigrate.length, 2500);
  assert.equal(applied, null);
  assert.equal(c.calls.updates, 0);
  assert.deepEqual(c.calls.ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.ok(rows.every((r) => r.password_hash === null), "dry run must not modify rows");
});

test("stays correct when the server caps pages below the requested size", async () => {
  const rows = makeUsers(1234);
  const { rows: got, pages } = await fetchAllUsers(fakeClient(rows, { maxRows: 400 }));
  assert.equal(got.length, 1234);
  assert.equal(new Set(got.map((r) => r.id)).size, 1234);
  assert.equal(pages, 4);
});

test("exactly 1,000 and 1,001 users (page boundary)", async () => {
  assert.equal((await fetchAllUsers(fakeClient(makeUsers(1000)))).rows.length, 1000);
  assert.equal((await fetchAllUsers(fakeClient(makeUsers(1001)))).rows.length, 1001);
  assert.equal((await fetchAllUsers(fakeClient([]))).rows.length, 0);
});

test("aborts if users are added while paging (early insert shifts pages; late insert changes the count)", async () => {
  const early = makeUsers(1500);
  const c1 = fakeClient(early, { onRead: (from) => { if (from === 1000) early.push({ id: "id-000000a", email: "x@x.com", password: "p", password_hash: null }); } });
  await assert.rejects(() => fetchAllUsers(c1), /Duplicate|changed|Fetched/);
  const late = makeUsers(1500);
  const c2 = fakeClient(late, { onRead: (from) => { if (from === 1000) late.push({ id: "id-zzzzzz", email: "y@y.com", password: "p", password_hash: null }); } });
  await assert.rejects(() => fetchAllUsers(c2), /changed/);
});

test("apply hashes every user, leaves plain text untouched, never prints secrets", async () => {
  const rows = makeUsers(1100);
  rows[5].password_hash = bcrypt.hashSync("already", 4);       // already migrated: untouched
  rows[6].password = null;                                      // no password set: skipped
  rows[7].password = bcrypt.hashSync("api-created", 4);         // API-created user: hash copied, not re-hashed
  const plainBefore = rows.map((r) => r.password);
  const alreadyHash = rows[5].password_hash;
  const out = capture();
  const { plan, applied } = await run(fakeClient(rows), { apply: true, hash: hashPassword, log: out.log });

  assert.equal(plan.alreadyMigrated, 1);
  assert.equal(plan.noPassword, 1);
  assert.equal(applied.migrated, 1098);
  assert.equal(applied.failed.length, 0);
  assert.deepEqual(rows.map((r) => r.password), plainBefore, "plain-text column must not change");
  assert.equal(rows[5].password_hash, alreadyHash);
  assert.equal(rows[6].password_hash, null);
  assert.equal(rows[7].password_hash, rows[7].password);
  for (const r of rows.filter((x, i) => i !== 6)) assert.ok(isBcryptHash(r.password_hash));
  assert.ok(await bcrypt.compare("Secret#0-plain", rows[0].password_hash), "hash verifies the original password");

  const text = out.lines.join("\n");
  assert.ok(!/Secret#/.test(text) && !/\$2[aby]\$/.test(text) && !/@example\.com/.test(text), "no password, hash or email in output");
});

test("a failing row is reported by id and does not stop the rest", async () => {
  const rows = makeUsers(10);
  const out = capture();
  const { applied } = await run(fakeClient(rows, { failUpdateFor: new Set(["id-000003"]) }), { apply: true, hash: hashPassword, log: out.log });
  assert.equal(applied.migrated, 9);
  assert.deepEqual(applied.failed, [{ id: "id-000003", code: "XX000" }]);
  assert.ok(out.lines.some((l) => l.includes("id-000003")));
});

test("never overwrites a hash that appeared after the read (is NULL guard)", async () => {
  const rows = makeUsers(3);
  const c = fakeClient(rows);
  const { rows: fetched } = await fetchAllUsers(c);
  rows[1].password_hash = bcrypt.hashSync("changed-meanwhile", 4);
  const keep = rows[1].password_hash;
  const { applyMigration } = await import("../scripts/lib/passwordMigration.js");
  const res = await applyMigration(c, fetched, { hash: hashPassword });
  assert.equal(res.skipped, 1);
  assert.equal(rows[1].password_hash, keep);
});

test("page size is validated", async () => {
  await assert.rejects(() => fetchAllUsers(fakeClient([]), { pageSize: MAX_PAGE_SIZE + 1 }), /pageSize/);
  await assert.rejects(() => fetchAllUsers(fakeClient([]), { pageSize: 0 }), /pageSize/);
});
