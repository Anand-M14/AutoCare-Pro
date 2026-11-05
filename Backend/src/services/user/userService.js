import supabase from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { hashPassword } from "../../utils/password.js";
import { sanitizeUser } from "../../utils/sanitizeUser.js";
import { cleanSearch, pageMeta, parsePage } from "../../utils/query.js";

export const STAFF_ROLES = ["Admin", "Manager", "Service Advisor", "Technician"];

export const getUsers = async () => {
  const { data, error } = await supabase
    .from("users").select("*").order("full_name", { ascending: true });
  if (error) throw error;
  return data.map(sanitizeUser);
};

/** Server-side paging, search, filters and sorting. Optionally attaches each customer's vehicles. */
export const getUsersPage = async (opts) => {
  const pg = parsePage(opts, { defaultLimit: 10, maxLimit: 100 });
  const sortable = ["full_name", "email", "role", "status"];
  const sort = sortable.includes(opts.sort) ? opts.sort : "full_name";

  let q = supabase.from("users").select("*", { count: "exact" });
  if (opts.group === "customers") q = q.eq("role", "Customer");
  else if (opts.group === "staff") q = q.in("role", STAFF_ROLES);
  if (opts.role) q = q.eq("role", opts.role);
  if (opts.status) q = q.eq("status", opts.status);
  const term = cleanSearch(opts.q);
  if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);

  const { data, count, error } = await q.order(sort, { ascending: opts.dir !== "desc" }).range(pg.from, pg.to);
  if (error) throw error;

  let rows = data.map(sanitizeUser);
  if (opts.include === "vehicles" && rows.length) {
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, customer_id, registration_number, vehicle_type, brand, model")
      .in("customer_id", rows.map((r) => r.id));
    if (vErr) throw vErr;
    rows = rows.map((r) => ({ ...r, vehicles: vehicles.filter((v) => String(v.customer_id) === String(r.id)) }));
  }
  return { rows, meta: pageMeta(pg, count ?? 0) };
};

export const createUser = async (input) => {
  const { password, ...rest } = input;
  const hash = await hashPassword(password);
  // `password` (legacy column) receives the bcrypt hash too, so no new plain text is ever stored
  // and the column stays valid if it is NOT NULL. password_hash needs migration 001.
  const { data, error } = await supabase
    .from("users")
    .insert([{ status: "Active", ...rest, password: hash, password_hash: hash }])
    .select().single();
  if (error) throw error;
  return sanitizeUser(data);
};

export const updateUserData = async (id, input, actor) => {
  if (String(id) === String(actor.id)) {
    if (input.role && input.role !== actor.role) throw ApiError.forbidden("You cannot change your own role");
    if (input.status && input.status.toLowerCase() === "inactive") throw ApiError.forbidden("You cannot deactivate your own account");
  }
  const { password, ...rest } = input;
  const patch = { ...rest };
  if (password) {
    const hash = await hashPassword(password);
    patch.password = hash;
    patch.password_hash = hash;
  }
  if (!Object.keys(patch).length) throw ApiError.badRequest("Nothing to update");
  const { data, error } = await supabase
    .from("users").update(patch).eq("id", id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound("User not found");
  return sanitizeUser(data);
};

const countRefs = async (table, column, id) => {
  const { count, error } = await supabase
    .from(table).select("id", { count: "exact", head: true }).eq(column, id);
  if (error) throw error;
  return count || 0;
};

/**
 * service_requests.customer_id is ON DELETE CASCADE, so deleting a customer would silently
 * delete their requests and reports. Refuse and ask for deactivation instead.
 */
export const deleteUserData = async (id, actor) => {
  if (String(id) === String(actor.id)) throw ApiError.forbidden("You cannot delete your own account");
  const checks = [
    ["vehicles", "customer_id"], ["service_requests", "customer_id"],
    ["service_requests", "advisor_id"], ["service_requests", "technician_id"],
    ["service_requests", "manager_id"], ["technician_reports", "technician_id"],
  ];
  for (const [t, c] of checks) {
    if (await countRefs(t, c, id)) {
      throw ApiError.conflict("This user has vehicles or service records. Set the account to Inactive instead of deleting it");
    }
  }
  const { data, error } = await supabase.from("users").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound("User not found");
};

/** Customer profile page: the account, their vehicles and their most recent service requests. */
export const getCustomerDetail = async (id, { customersOnly }) => {
  const { data: user, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!user || (customersOnly && user.role !== "Customer")) throw ApiError.notFound("Customer not found");
  const [vehicles, requests] = await Promise.all([
    supabase.from("vehicles").select("*").eq("customer_id", id).order("registration_number"),
    supabase.from("service_requests").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (vehicles.error) throw vehicles.error;
  if (requests.error) throw requests.error;
  return { ...sanitizeUser(user), vehicles: vehicles.data, requests: requests.data };
};
