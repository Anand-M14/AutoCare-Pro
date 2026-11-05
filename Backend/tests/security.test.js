import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "http://127.0.0.1:9";   // unreachable on purpose: no DB is needed
process.env.SUPABASE_KEY = "test-key";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.CORS_ORIGINS = "http://localhost:5173";

const { createApp } = await import("../src/app.js");

const hash = bcrypt.hashSync("Str0ngPass", 4);
const users = [
  { id: "u-admin", email: "admin@x.com", role: "Admin", status: "Active", full_name: "A", password: "x", password_hash: hash },
  { id: "u-cust", email: "cust@x.com", role: "Customer", status: "Active", full_name: "C", password: "123456", password_hash: null },
  { id: "u-tech", email: "tech@x.com", role: "Technician", status: "Active", full_name: "T", password: "9", password_hash: hash },
  { id: "u-adv", email: "adv@x.com", role: "Service Advisor", status: "Active", full_name: "V", password: "9", password_hash: hash },
  { id: "u-mgr", email: "mgr@x.com", role: "Manager", status: "Active", full_name: "M", password: "9", password_hash: hash },
  { id: "u-off", email: "off@x.com", role: "Customer", status: "Inactive", full_name: "O", password: "9", password_hash: hash },
];
const store = {
  findByEmail: async (e) => users.find((u) => u.email === e.toLowerCase()) || null,
  findById: async (id) => users.find((u) => u.id === id) || null,
  createCustomer: async (row) => { const u = { id: `u-new-${users.length}`, ...row }; users.push(u); return u; },
  setPasswordHash: async () => { throw new Error("must not be called by default"); },
};

let server, base;
before(async () => {
  const app = createApp();
  app.locals.userStore = store;
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (method, path, { token, body, headers } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null), res };
};
const sign = (id, opts = {}, secret = process.env.JWT_SECRET) =>
  jwt.sign({ role: "Admin" }, secret, { subject: id, expiresIn: "1h", ...opts });

test("every private route rejects anonymous callers with 401", async () => {
  const routes = [
    ["GET", "/api/users"], ["POST", "/api/users"], ["PUT", "/api/users/1"], ["DELETE", "/api/users/1"],
    ["GET", "/api/requests"], ["GET", "/api/requests/1"], ["POST", "/api/requests"],
    ["PUT", "/api/requests/1"], ["DELETE", "/api/requests/1"], ["POST", "/api/requests/1/approve"], ["POST", "/api/requests/1/reject"],
    ["GET", "/api/manager/requests"], ["GET", "/api/manager/advisors"], ["PUT", "/api/manager/assign-advisor/1"],
    ["GET", "/api/manager/reports"], ["PUT", "/api/manager/reports/1/approve"],
    ["GET", "/api/advisor/requests"], ["GET", "/api/advisor/technicians"], ["PUT", "/api/advisor/assign-technician/1"],
    ["GET", "/api/advisor/reports"], ["PUT", "/api/advisor/reports/1/verify"],
    ["PUT", "/api/technician/requests/1/start"], ["PUT", "/api/technician/requests/1/complete"],
    ["POST", "/api/technician/requests/1/report"],
    ["GET", "/api/dashboard/admin"], ["GET", "/api/dashboard/overview"], ["GET", "/api/auth/me"],
  ];
  for (const [m, p] of routes) {
    const r = await call(m, p);
    assert.equal(r.status, 401, `${m} ${p} should be 401, got ${r.status}`);
  }
});

test("forged / expired / alg=none / unknown-user tokens are rejected", async () => {
  assert.equal((await call("GET", "/api/users", { token: sign("u-admin", {}, "wrong-secret-wrong-secret-wrong-1234") })).status, 401);
  assert.equal((await call("GET", "/api/users", { token: sign("u-admin", { expiresIn: "-10s" }) })).status, 401);
  const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") + "." +
    Buffer.from(JSON.stringify({ sub: "u-admin", role: "Admin" })).toString("base64url") + ".";
  assert.equal((await call("GET", "/api/users", { token: none })).status, 401);
  assert.equal((await call("GET", "/api/users", { token: sign("ghost") })).status, 401);
  assert.equal((await call("GET", "/api/users", { token: sign("u-off") })).status, 403); // inactive
});

test("role in the token is ignored: the database role decides", async () => {
  // token claims Admin, but u-cust is a Customer
  const r = await call("GET", "/api/users", { token: sign("u-cust") });
  assert.equal(r.status, 403);
});

test("role-based access control", async () => {
  const t = (id) => sign(id);
  assert.equal((await call("GET", "/api/users", { token: t("u-cust") })).status, 403);
  assert.equal((await call("POST", "/api/users", { token: t("u-mgr") })).status, 403);
  assert.equal((await call("DELETE", "/api/users/x", { token: t("u-adv") })).status, 403);
  assert.equal((await call("GET", "/api/users", { token: t("u-tech") })).status, 403);
  assert.equal((await call("GET", "/api/dashboard/overview", { token: t("u-cust") })).status, 403);
  assert.equal((await call("GET", "/api/dashboard/overview", { token: t("u-adv") })).status, 403);
  assert.equal((await call("GET", "/api/users?page=0&limit=500", { token: t("u-admin") })).status, 400);
  assert.equal((await call("GET", "/api/users?sort=password", { token: t("u-admin") })).status, 400);
  assert.equal((await call("GET", "/api/dashboard/overview?range=forever", { token: t("u-admin") })).status, 400);
  assert.equal((await call("GET", "/api/requests?status=Hacked", { token: t("u-admin") })).status, 400);
  assert.equal((await call("GET", "/api/manager/requests", { token: t("u-adv") })).status, 403);
  assert.equal((await call("GET", "/api/advisor/requests", { token: t("u-tech") })).status, 403);
  assert.equal((await call("PUT", "/api/technician/requests/1/start", { token: t("u-adv") })).status, 403);
  assert.equal((await call("GET", "/api/dashboard/admin", { token: t("u-cust") })).status, 403);
  assert.equal((await call("GET", "/api/dashboard/manager", { token: t("u-cust") })).status, 403);
  assert.equal((await call("DELETE", "/api/requests/1", { token: t("u-mgr") })).status, 403);
  assert.equal((await call("POST", "/api/requests", { token: t("u-tech") })).status, 403);
  assert.equal((await call("GET", "/api/dashboard/bogus", { token: t("u-admin") })).status, 400);
});

test("login: bcrypt user, legacy plain-text user, wrong password, unknown email", async () => {
  const ok = await call("POST", "/api/auth/login", { body: { email: "ADMIN@x.com", password: "Str0ngPass" } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  assert.equal(ok.json.user.password, undefined);
  assert.equal(ok.json.user.password_hash, undefined);
  assert.equal(ok.json.user.role, "Admin");

  const legacy = await call("POST", "/api/auth/login", { body: { email: "cust@x.com", password: "123456" } });
  assert.equal(legacy.status, 200, "legacy users must still be able to log in");

  const bad = await call("POST", "/api/auth/login", { body: { email: "admin@x.com", password: "nope" } });
  const ghost = await call("POST", "/api/auth/login", { body: { email: "ghost@x.com", password: "nope" } });
  assert.equal(bad.status, 401);
  assert.equal(ghost.status, 401);
  assert.equal(bad.json.message, ghost.json.message, "no user enumeration");

  assert.equal((await call("POST", "/api/auth/login", { body: { email: "off@x.com", password: "Str0ngPass" } })).status, 403);
  assert.equal((await call("POST", "/api/auth/login", { body: { email: "not-an-email", password: "x" } })).status, 400);
  assert.equal((await call("POST", "/api/auth/login", { body: {} })).status, 400);
});

test("hash column takes priority: old plain text is not accepted once migrated", async () => {
  const r = await call("POST", "/api/auth/login", { body: { email: "tech@x.com", password: "9" } });
  assert.equal(r.status, 401);
});

test("login token works on /me and never leaks credentials", async () => {
  const { json } = await call("POST", "/api/auth/login", { body: { email: "mgr@x.com", password: "Str0ngPass" } });
  const me = await call("GET", "/api/auth/me", { token: json.token });
  assert.equal(me.status, 200);
  assert.equal(me.json.data.email, "mgr@x.com");
  assert.equal(JSON.stringify(me.json).includes("password"), false);
  const dash = await call("GET", "/api/dashboard/admin", { token: json.token });
  assert.equal(dash.status, 403, "manager must not open the admin dashboard");
});

test("user validation rejects bad input before touching the database", async () => {
  const admin = sign("u-admin");
  const bad = await call("POST", "/api/users", { token: admin, body: { full_name: "x", email: "bad", phone: "12", password: "123456", role: "Root" } });
  assert.equal(bad.status, 400);
  for (const f of ["full_name", "email", "phone", "password", "role"]) assert.ok(bad.json.errors[f], `${f} should be reported`);
  assert.equal((await call("PUT", "/api/users/..%2f..", { token: admin, body: { full_name: "Valid Name" } })).status, 400);
  assert.equal((await call("PUT", "/api/users/u-admin", { token: admin, body: {} })).status, 400);
});

test("admin cannot demote, deactivate or delete themselves", async () => {
  const admin = sign("u-admin");
  assert.equal((await call("PUT", "/api/users/u-admin", { token: admin, body: { role: "Customer" } })).status, 403);
  assert.equal((await call("PUT", "/api/users/u-admin", { token: admin, body: { status: "Inactive" } })).status, 403);
  assert.equal((await call("DELETE", "/api/users/u-admin", { token: admin })).status, 403);
});

test("CORS: unknown origins are blocked, security headers are set", async () => {
  const blocked = await call("GET", "/api/health", { headers: { Origin: "https://evil.example" } });
  assert.equal(blocked.status, 403);
  const ok = await call("GET", "/api/health", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(ok.res.headers.get("x-powered-by"), null);
});

test("malformed JSON and unknown routes give clean JSON errors", async () => {
  const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).success, false);
  assert.equal((await call("GET", "/api/nope")).status, 404);
});

test("login is rate limited", async () => {
  let last;
  for (let i = 0; i < 12; i++) last = await call("POST", "/api/auth/login", { body: { email: "rl@x.com", password: "bad" } });
  assert.equal(last.status, 429);
});

test("advisor/dashboard identity override beats client-supplied ids (Express 5 read-only query)", async () => {
  const express = (await import("express")).default;
  const { forceQueryIdentity, forceBodyIdentity } = await import("../src/middleware/authorize.js");
  const app = express();
  app.use(express.json());
  app.use((req, _r, n) => { req.user = { id: "me", role: "Service Advisor" }; n(); });
  app.get("/q", forceQueryIdentity("advisorId", ["Service Advisor"]), (req, res) => res.json(req.query));
  app.post("/b", forceBodyIdentity("advisorId", ["Service Advisor"]), (req, res) => res.json(req.body));
  const s = await new Promise((r) => { const x = app.listen(0, () => r(x)); });
  const b = `http://127.0.0.1:${s.address().port}`;
  const q = await (await fetch(`${b}/q?advisorId=SOMEONE_ELSE&x=1`)).json();
  assert.deepEqual(q, { advisorId: "me", x: "1" });
  const p = await (await fetch(`${b}/b`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ advisorId: "SOMEONE_ELSE" }) })).json();
  assert.equal(p.advisorId, "me");
  s.close();
});

test("public registration always creates a Customer and returns no credentials", async () => {
  const r = await call("POST", "/api/auth/register", { body: { full_name: "New Person", email: "New@Example.com", phone: "98765 43210", password: "Passw0rdOK", role: "Admin", status: "Inactive" } });
  assert.equal(r.status, 201);
  assert.equal(r.json.user.role, "Customer", "client-supplied role must be ignored");
  assert.equal(r.json.user.status, "Active");
  assert.equal(r.json.user.email, "new@example.com");
  assert.equal(JSON.stringify(r.json).includes("password"), false);
  const created = users.find((u) => u.email === "new@example.com");
  assert.ok(bcrypt.compareSync("Passw0rdOK", created.password_hash), "stored as bcrypt");
  const login = await call("POST", "/api/auth/login", { body: { email: "new@example.com", password: "Passw0rdOK" } });
  assert.equal(login.status, 200);
  assert.equal((await call("POST", "/api/auth/register", { body: { full_name: "Dup", email: "new@example.com", phone: "9000000001", password: "Passw0rdOK" } })).status, 409);
  const weak = await call("POST", "/api/auth/register", { body: { full_name: "X", email: "bad", phone: "1", password: "123456" } });
  assert.equal(weak.status, 400);
});

test("search text cannot inject PostgREST filters", async () => {
  const { cleanSearch, parsePage, pageMeta } = await import("../src/utils/query.js");
  assert.equal(cleanSearch("a%,role.eq.Admin)(*"), "a role.eq.Admin");
  assert.equal(cleanSearch('x"y\\z'), "x y z");
  assert.equal(cleanSearch(null), "");
  assert.deepEqual(parsePage({ page: "3", limit: "20" }), { page: 3, limit: 20, from: 40, to: 59 });
  assert.equal(parsePage({ limit: "9999" }).limit, 100);
  assert.equal(parsePage({ page: "-4" }).page, 1);
  assert.deepEqual(pageMeta({ page: 1, limit: 10 }, 0), { page: 1, limit: 10, total: 0, pages: 1 });
});

test("approve / reject: role rules and validation", async () => {
  const t = (id) => sign(id);
  assert.equal((await call("POST", "/api/requests/1/approve", { token: t("u-cust"), body: { advisor_id: "a" } })).status, 403);
  assert.equal((await call("POST", "/api/requests/1/reject", { token: t("u-adv"), body: { reason: "nope nope" } })).status, 403);
  assert.equal((await call("POST", "/api/requests/1/approve", { token: t("u-mgr"), body: {} })).status, 400);
  assert.equal((await call("POST", "/api/requests/1/reject", { token: t("u-admin"), body: { reason: "x" } })).status, 400);
  assert.equal((await call("POST", "/api/requests/..%2f/approve", { token: t("u-admin"), body: { advisor_id: "a" } })).status, 400);
});
