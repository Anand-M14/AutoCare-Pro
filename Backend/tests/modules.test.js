import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createFake } from "./fakeSupabase.js";

process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_KEY = "test-key";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.BCRYPT_ROUNDS = "4";
process.env.SENDGRID_API_KEY = "SG.fake-key-for-tests";
process.env.SENDGRID_FROM_EMAIL = "no-reply@autocare.test";

const H = bcrypt.hashSync("Str0ngPass", 4);
const U = (id, role, extra = {}) => ({ id, role, status: "Active", full_name: `${role} ${id}`, email: `${id}@x.com`, phone: `90000000${id.length}${id.charCodeAt(1)}`, password: H, password_hash: H, ...extra });
const fake = createFake({
  users: [U("a1", "Admin"), U("m1", "Manager"), U("s1", "Service Advisor"), U("t1", "Technician"), U("c1", "Customer"), U("c2", "Customer")],
  vehicles: [{ id: "v-c2", customer_id: "c2", registration_number: "TN 01 ZZ 0001", vehicle_type: "Car", brand: "Honda", model: "City" }],
  service_requests: [],
});
globalThis.__acSupabase = fake;

const { createApp } = await import("../src/app.js");
const { transport } = await import("../src/services/email/emailService.js");
const sent = [];
transport.send = async (p) => { sent.push(p); };

let server, base;
before(async () => { const app = createApp(); await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

const tok = (id) => jwt.sign({}, process.env.JWT_SECRET, { subject: id, expiresIn: "1h" });
const call = async (method, path, who, body) => {
  const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(who ? { Authorization: `Bearer ${tok(who)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const tick = () => new Promise((r) => setTimeout(r, 30));
const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

test("vehicles: customer adds own vehicle; plate normalised; customer_id forced to self", async () => {
  const r = await call("POST", "/api/vehicles", "c1", { registration_number: "tn 09-ab 4521", vehicle_type: "Car", brand: "Maruti", model: "Swift", customer_id: "c2" });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.registration_number, "TN 09 AB 4521");
  assert.equal(r.json.data.customer_id, "c1", "a customer cannot create vehicles for someone else");
});

test("vehicles: validation, duplicates and Bike type", async () => {
  assert.equal((await call("POST", "/api/vehicles", "c1", { registration_number: "x", vehicle_type: "Truck", brand: "A" })).status, 400);
  const dup = await call("POST", "/api/vehicles", "c1", { registration_number: "TN09AB4521", vehicle_type: "Car", brand: "Maruti", model: "Swift" });
  assert.equal(dup.status, 409, "same plate written without spaces is still a duplicate");
  const bike = await call("POST", "/api/vehicles", "c1", { registration_number: "TN 22 BK 0089", vehicle_type: "Bike", brand: "Yamaha", model: "R15" });
  assert.equal(bike.status, 201);
  const same = await call("POST", "/api/vehicles", "c1", { registration_number: "TN 22 BK 0089", vehicle_type: "Bike", brand: "Yamaha", model: "R15" });
  assert.equal(same.status, 409);
});

test("vehicles: ownership - customers see only their own; staff see all; list is paginated", async () => {
  const mine = await call("GET", "/api/vehicles?limit=1", "c1");
  assert.equal(mine.status, 200);
  assert.equal(mine.json.meta.total, 2);
  assert.equal(mine.json.data.length, 1);
  assert.ok(mine.json.data.every((v) => v.customer_id === "c1"));
  assert.equal((await call("GET", "/api/vehicles/v-c2", "c1")).status, 403);
  assert.equal((await call("PUT", "/api/vehicles/v-c2", "c1", { color: "Red" })).status, 403);
  assert.equal((await call("DELETE", "/api/vehicles/v-c2", "c1")).status, 403);
  const all = await call("GET", "/api/vehicles", "m1");
  assert.equal(all.json.meta.total, 3);
  assert.equal((await call("GET", "/api/vehicles?type=Bike", "s1")).json.meta.total, 1);
  assert.equal((await call("GET", "/api/vehicles?q=honda", "s1")).json.meta.total, 1);
  assert.equal((await call("GET", "/api/vehicles", "t1")).status, 403);
});

test("vehicles: admin/advisor must choose a real customer", async () => {
  const body = { registration_number: "KA 03 MN 7712", vehicle_type: "Car", brand: "Hyundai", model: "i20" };
  assert.equal((await call("POST", "/api/vehicles", "s1", body)).status, 400);
  assert.equal((await call("POST", "/api/vehicles", "s1", { ...body, customer_id: "m1" })).status, 400, "a manager is not a customer");
  assert.equal((await call("POST", "/api/vehicles", "s1", { ...body, customer_id: "c2" })).status, 201);
});

const book = (who, extra = {}) => call("POST", "/api/requests", who, { service_type: "General service", preferred_date: future, preferred_time: "10:30", customer_problem: "Engine makes a noise", ...extra });

test("booking: validation, ownership, past dates", async () => {
  const mine = (await call("GET", "/api/vehicles", "c1")).json.data[0];
  assert.equal((await book("c1", { vehicle_id: mine.id, preferred_date: "2020-01-01" })).status, 400);
  assert.equal((await book("c1", { vehicle_id: mine.id, preferred_time: "25:99" })).status, 400);
  assert.equal((await book("c1", { vehicle_id: mine.id, customer_problem: "x" })).status, 400);
  assert.equal((await book("c1", { vehicle_id: "v-c2" })).status, 403, "cannot book someone else's vehicle");
  assert.equal((await book("t1", { vehicle_id: mine.id })).status, 403);
});

test("booking: creates Pending request, sends one confirmation email, blocks a second open booking", async () => {
  sent.length = 0;
  const mine = (await call("GET", "/api/vehicles?q=swift", "c1")).json.data[0];
  const ok = await book("c1", { vehicle_id: mine.id });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.data.request_status, "Pending");
  assert.match(ok.json.data.request_number, /^SR\d{3}$/);
  await tick();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].personalizations[0].to[0].email, "c1@x.com");
  assert.match(sent[0].subject, /Booking received/);
  const again = await book("c1", { vehicle_id: mine.id });
  assert.equal(again.status, 409);
  await tick();
  assert.equal(sent.length, 1, "a rejected duplicate must not send another email");
});

test("requests: customer sees only their own, approve + reject decide Pending only and email the customer", async () => {
  const list = await call("GET", "/api/requests?page=1", "c1");
  assert.equal(list.json.meta.total, 1);
  assert.equal((await call("GET", "/api/requests?page=1", "c2")).json.meta.total, 0);
  const id = list.json.data[0].id;
  assert.equal((await call("GET", `/api/requests/${id}`, "c2")).status, 403);
  assert.equal((await call("POST", `/api/requests/${id}/approve`, "c1", { advisor_id: "s1" })).status, 403);
  assert.equal((await call("POST", `/api/requests/${id}/approve`, "m1", { advisor_id: "t1" })).status, 400, "advisor must be a Service Advisor");
  sent.length = 0;
  const ok = await call("POST", `/api/requests/${id}/approve`, "m1", { advisor_id: "s1" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.request_status, "Advisor Assigned");
  assert.equal(ok.json.data.manager_id, "m1");
  await tick();
  assert.match(sent[0].subject, /approved/i);
  assert.equal((await call("POST", `/api/requests/${id}/approve`, "m1", { advisor_id: "s1" })).status, 409, "cannot decide twice");
  assert.equal((await call("POST", `/api/requests/${id}/reject`, "m1", { reason: "x" })).status, 400);
});

test("requests: rejection stores the reason and emails it", async () => {
  const bike = (await call("GET", "/api/vehicles?type=Bike", "c1")).json.data[0];
  const b = await book("c1", { vehicle_id: bike.id });
  sent.length = 0;
  const r = await call("POST", `/api/requests/${b.json.data.id}/reject`, "a1", { reason: "No slots on that day" });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.request_status, "Rejected");
  await tick();
  assert.match(sent[0].subject, /Booking update/);
  assert.ok(sent[0].content[1].value.includes("No slots on that day"));
});

test("vehicles: cannot delete a vehicle with service records; can delete a clean one; history works", async () => {
  const swift = (await call("GET", "/api/vehicles?q=swift", "c1")).json.data[0];
  assert.equal((await call("DELETE", `/api/vehicles/${swift.id}`, "c1")).status, 409);
  const h = await call("GET", `/api/vehicles/${swift.id}/history`, "c1");
  assert.equal(h.json.data.length, 1);
  assert.equal((await call("GET", `/api/vehicles/${swift.id}/history`, "c2")).status, 403);
  const fresh = await call("POST", "/api/vehicles", "c1", { registration_number: "DL 01 ZZ 9999", vehicle_type: "Car", brand: "Kia", model: "Seltos" });
  assert.equal((await call("DELETE", `/api/vehicles/${fresh.json.data.id}`, "c1")).status, 200);
});

test("customers: detail page scoped by role", async () => {
  const d = await call("GET", "/api/users/c1", "s1");
  assert.equal(d.status, 200);
  assert.equal(d.json.data.vehicles.length, 2);
  assert.equal(d.json.data.password, undefined);
  assert.equal((await call("GET", "/api/users/t1", "s1")).status, 404, "advisors cannot open staff accounts");
  assert.equal((await call("GET", "/api/users/t1", "a1")).status, 200);
  assert.equal((await call("GET", "/api/users/c1", "c1")).status, 403);
});

test("profile: update own name/phone only; duplicate phone is a clean 409", async () => {
  const ok = await call("PUT", "/api/auth/me", "c1", { full_name: "Renamed Person", role: "Admin", email: "evil@x.com" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.full_name, "Renamed Person");
  assert.equal(ok.json.data.role, "Customer", "role cannot be changed through the profile endpoint");
  assert.equal(ok.json.data.email, "c1@x.com");
  const c2 = fake.db.users.find((u) => u.id === "c2");
  assert.equal((await call("PUT", "/api/auth/me", "c1", { phone: c2.phone })).status, 409);
  assert.equal((await call("PUT", "/api/auth/me", "c1", {})).status, 400);
});

test("change password: needs the current password, enforces strength, emails a notice", async () => {
  assert.equal((await call("POST", "/api/auth/change-password", "c1", { current_password: "wrong", new_password: "NewPass123" })).status, 400);
  assert.equal((await call("POST", "/api/auth/change-password", "c1", { current_password: "Str0ngPass", new_password: "short" })).status, 400);
  sent.length = 0;
  assert.equal((await call("POST", "/api/auth/change-password", "c1", { current_password: "Str0ngPass", new_password: "NewPass123" })).status, 200);
  await tick();
  assert.match(sent[0].subject, /password was changed/);
  const login = await call("POST", "/api/auth/login", null, { email: "c1@x.com", password: "NewPass123" });
  assert.equal(login.status, 200);
  assert.equal((await call("POST", "/api/auth/login", null, { email: "c1@x.com", password: "Str0ngPass" })).status, 401);
});

test("forgot / reset password: neutral answer, one-time token, expiry, no token stored in clear", async () => {
  sent.length = 0;
  const unknown = await call("POST", "/api/auth/forgot-password", null, { email: "nobody@x.com" });
  const known = await call("POST", "/api/auth/forgot-password", null, { email: "c2@x.com" });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.json.message, known.json.message, "same answer whether or not the account exists");
  await tick();
  assert.equal(sent.length, 1);
  const token = /reset-password\?token=([A-Za-z0-9_-]+)/.exec(sent[0].content[1].value)[1];
  const stored = fake.db.users.find((u) => u.id === "c2");
  assert.notEqual(stored.password_reset_token_hash, token);
  assert.equal((await call("POST", "/api/auth/reset-password", null, { token: "A".repeat(43), password: "Another123" })).status, 400);
  assert.equal((await call("POST", "/api/auth/reset-password", null, { token, password: "weak" })).status, 400);
  assert.equal((await call("POST", "/api/auth/reset-password", null, { token, password: "Another123" })).status, 200);
  assert.equal((await call("POST", "/api/auth/reset-password", null, { token, password: "Another456" })).status, 400, "token works once");
  assert.equal((await call("POST", "/api/auth/login", null, { email: "c2@x.com", password: "Another123" })).status, 200);

  await call("POST", "/api/auth/forgot-password", null, { email: "c2@x.com" });
  const t2 = /token=([A-Za-z0-9_-]+)/.exec(sent.at(-1).content[1].value)[1];
  stored.password_reset_expires = new Date(Date.now() - 1000).toISOString();
  assert.equal((await call("POST", "/api/auth/reset-password", null, { token: t2, password: "Another789" })).status, 400, "expired token");
});

test("email failures never break the business action; unconfigured/invalid recipients are skipped", async () => {
  const { sendEmail } = await import("../src/services/email/emailService.js");
  const orig = transport.send;
  transport.send = async () => { throw Object.assign(new Error("boom"), { status: 500 }); };
  assert.equal(await sendEmail("welcome", "ok@x.com", { name: "A" }), "failed");
  transport.send = orig;
  assert.equal(await sendEmail("welcome", "not-an-email", { name: "A" }), "skipped");
  const html = (await (async () => { sent.length = 0; await sendEmail("welcome", "ok@x.com", { name: "<script>alert(1)</script>" }); return sent[0].content[1].value; })());
  assert.ok(!html.includes("<script>alert(1)</script>"), "dynamic values are HTML-escaped");
});

test("register sends the welcome email and creates a Customer", async () => {
  sent.length = 0;
  const r = await call("POST", "/api/auth/register", null, { full_name: "New Person", email: "new@x.com", phone: "9123456780", password: "Welcome123", role: "Admin" });
  assert.equal(r.status, 201);
  assert.equal(r.json.user.role, "Customer");
  await tick();
  assert.match(sent[0].subject, /Welcome/);
  assert.equal((await call("POST", "/api/auth/register", null, { full_name: "Dup", email: "new@x.com", phone: "9123456781", password: "Welcome123" })).status, 409);
});

test("role dashboards return real counts (no placeholder zeros) and scope to the caller", async () => {
  fake.db.service_requests.push(
    { id: "x1", request_number: "SR900", customer_id: "c2", advisor_id: "s1", technician_id: "t1", vehicle_id: "v-c2", request_status: "Technician Assigned" },
    { id: "x2", request_number: "SR901", customer_id: "c2", advisor_id: "s1", technician_id: "t1", vehicle_id: "v-c2", request_status: "Service Completed" },
    { id: "x3", request_number: "SR902", customer_id: "c2", advisor_id: "s1", technician_id: "other", vehicle_id: "v-c2", request_status: "Report Submitted" },
  );
  const tech = await call("GET", "/api/dashboard/technician", "t1");
  assert.equal(tech.status, 200);
  assert.deepEqual(tech.json.data.cards, { toStart: 1, inProgress: 0, reportDue: 1, done: 0 });
  assert.equal(tech.json.data.recentRequests.length, 2);
  const adv = await call("GET", "/api/dashboard/advisor", "s1");
  assert.equal(adv.json.data.cards.reportsToVerify, 1);
  assert.equal(adv.json.data.cards.inRepair, 2);
  const cus = await call("GET", "/api/dashboard/customer", "c2");
  assert.equal(cus.json.data.cards.vehicles, 2);
  assert.ok(cus.json.data.cards.open >= 3);
  assert.equal((await call("GET", "/api/dashboard/technician", "c2")).status, 403);
});

test("technician: lists only own jobs; report read is ownership-checked", async () => {
  const mine = await call("GET", "/api/technician/requests", "t1");
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.json.data.map((r) => r.id).sort(), ["x1", "x2"]);
  assert.equal((await call("GET", "/api/technician/requests", "c1")).status, 403);
  assert.equal((await call("GET", "/api/technician/requests/x3/report", "t1")).status, 403);
  assert.equal((await call("GET", "/api/technician/requests/x1/report", "t1")).status, 200);
});

test("final steps: manager-approved -> vehicle ready -> completed; advisor-owned, one-way, emails the customer", async () => {
  fake.db.service_requests.push({ id: "f1", request_number: "SR950", customer_id: "c2", advisor_id: "s1", vehicle_id: "v-c2", request_status: "Manager Approved" });
  sent.length = 0;
  assert.equal((await call("PUT", "/api/advisor/requests/f1/vehicle-ready", "t1")).status, 403);
  assert.equal((await call("PUT", "/api/advisor/requests/f1/complete", "s1")).status, 409, "cannot skip Vehicle Ready");
  const r = await call("PUT", "/api/advisor/requests/f1/vehicle-ready", "s1");
  assert.equal(r.status, 200);
  assert.equal(r.json.data.request_status, "Vehicle Ready");
  await tick();
  assert.match(sent.at(-1).subject, /Your vehicle is ready/);
  assert.equal((await call("PUT", "/api/advisor/requests/f1/vehicle-ready", "s1")).status, 409, "only once");
  assert.equal((await call("PUT", "/api/advisor/requests/f1/complete", "s1")).json.data.request_status, "Completed");
  await tick();
  assert.match(sent.at(-1).subject, /Service completed/);
  fake.db.service_requests.push({ id: "f2", request_number: "SR951", customer_id: "c2", advisor_id: "someone-else", vehicle_id: "v-c2", request_status: "Manager Approved" });
  assert.equal((await call("PUT", "/api/advisor/requests/f2/vehicle-ready", "s1")).status, 403, "advisor can only act on own requests");
});
