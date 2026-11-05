// Minimal in-memory stand-in for the parts of supabase-js the app uses. Embedded selects ("customer:customer_id(...)") are ignored.
import crypto from "node:crypto";

const UNIQUE = { vehicles: ["registration_number", "chassis_number", "engine_number"], service_requests: ["request_number"], users: ["email", "phone"] };
const FK_TABLE = { customer_id: "users", advisor_id: "users", technician_id: "users", manager_id: "users", vehicle_id: "vehicles", request_id: "service_requests" };
const like = (v, pat) => new RegExp("^" + String(pat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i").test(String(v ?? ""));

export function createFake(seed = {}) {
  const db = Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const t = (n) => (db[n] ||= []);

  const from = (table) => {
    const st = { op: "select", filters: [], order: null, range: null, limit: null, patch: null, rows: null, head: false, count: false, single: null, returning: false };
    const api = {
      select(c, o = {}) { st.embeds = [...String(c || "").matchAll(/(\w+):(\w+)\s*\(/g)].map((m) => [m[1], m[2]]); if (st.op === "select") { st.head = !!o.head; st.count = o.count === "exact"; } else st.returning = true; return api; },
      insert(rows) { st.op = "insert"; st.rows = rows; return api; },
      update(p) { st.op = "update"; st.patch = p; return api; },
      delete() { st.op = "delete"; return api; },
      eq(c, v) { st.filters.push((r) => String(r[c]) === String(v)); return api; },
      neq(c, v) { st.filters.push((r) => String(r[c]) !== String(v)); return api; },
      gte(c, v) { st.filters.push((r) => r[c] >= v); return api; },
      in(c, vs) { st.filters.push((r) => vs.map(String).includes(String(r[c]))); return api; },
      is(c, v) { st.filters.push((r) => (r[c] ?? null) === v); return api; },
      ilike(c, p) { st.filters.push((r) => like(r[c], p)); return api; },
      not(c, op, v) { const list = String(v).replace(/[()]/g, "").split(","); st.filters.push((r) => !list.includes(String(r[c]))); return api; },
      or(expr) {
        const parts = expr.split(/,(?=[a-z_]+\.)/).map((p) => p.split("."));
        st.filters.push((r) => parts.some(([c, , ...pat]) => like(r[c], pat.join("."))));
        return api;
      },
      order(c, { ascending = true } = {}) { st.order = [c, ascending]; return api; },
      range(a, b) { st.range = [a, b]; return api; },
      limit(n) { st.limit = n; return api; },
      single() { st.single = "single"; return api; },
      maybeSingle() { st.single = "maybe"; return api; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };

    function run() {
      const rows = t(table);
      const match = () => rows.filter((r) => st.filters.every((f) => f(r)));
      const embed = (list) => st.embeds?.length ? list.map((r) => { const o = { ...r }; for (const [alias, fk] of st.embeds) o[alias] = (t(FK_TABLE[fk] || "users").find((x) => String(x.id) === String(r[fk])) || null); return o; }) : list;
      const shape = (list0) => {
        const list = embed(list0);
        if (st.single) {
          if (list.length > 1 && st.single === "maybe") return { data: null, error: { code: "PGRST116" } };
          if (!list.length) return st.single === "single" ? { data: null, error: { code: "PGRST116" } } : { data: null, error: null };
          return { data: { ...list[0] }, error: null };
        }
        return { data: list.map((r) => ({ ...r })), error: null };
      };
      if (st.op === "insert") {
        const out = [];
        for (const raw of st.rows) {
          const row = { id: raw.id ?? crypto.randomUUID(), created_at: new Date().toISOString(), ...raw };
          for (const col of UNIQUE[table] || []) {
            if (row[col] != null && rows.some((r) => String(r[col]).toLowerCase() === String(row[col]).toLowerCase())) return { data: null, error: { code: "23505", message: "duplicate" } };
          }
          rows.push(row); out.push(row);
        }
        return shape(out);
      }
      if (st.op === "update") {
        const hit = match();
        for (const col of UNIQUE[table] || []) if (st.patch[col] != null && rows.some((r) => !hit.includes(r) && String(r[col]) === String(st.patch[col]))) return { data: null, error: { code: "23505" } };
        hit.forEach((r) => Object.assign(r, st.patch));
        return st.returning ? shape(hit) : { data: null, error: null };
      }
      if (st.op === "delete") {
        const hit = match();
        hit.forEach((r) => rows.splice(rows.indexOf(r), 1));
        return st.returning ? shape(hit) : { data: null, error: null };
      }
      let list = match();
      const total = list.length;
      if (st.order) { const [c, asc] = st.order; list = [...list].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
      if (st.range) list = list.slice(st.range[0], st.range[1] + 1);
      if (st.limit != null) list = list.slice(0, st.limit);
      if (st.head) return { data: null, count: total, error: null };
      const out = shape(list);
      if (st.count) out.count = total;
      return out;
    }
    return api;
  };
  return { from, db };
}
