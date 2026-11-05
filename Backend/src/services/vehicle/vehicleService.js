import supabase from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";
import { cleanSearch, pageMeta, parsePage } from "../../utils/query.js";

const SELECT = "*, customer:customer_id ( id, full_name, email, phone )";
const OPEN_STATUS_EXCLUDED = ["Completed", "Rejected"];

const friendly = (error) => {
  if (error?.code === "23505") return ApiError.conflict("A vehicle with this registration, chassis or engine number already exists");
  return error;
};

const typeFilter = (q, type) => (type === "Bike" ? q.or("vehicle_type.ilike.%bike%,vehicle_type.ilike.%motor%") : q.ilike("vehicle_type", "%car%"));

export const getVehiclesPage = async (opts, scope = {}) => {
  const pg = parsePage(opts, { defaultLimit: 12, maxLimit: 100 });
  const sort = ["registration_number", "brand", "model", "vehicle_type"].includes(opts.sort) ? opts.sort : "registration_number";
  let q = supabase.from("vehicles").select(SELECT, { count: "exact" });
  const customerId = scope.customerId || opts.customer_id;
  if (customerId) q = q.eq("customer_id", customerId);
  if (opts.type) q = typeFilter(q, opts.type);
  const term = cleanSearch(opts.q);
  if (term) q = q.or(`registration_number.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
  const { data, count, error } = await q.order(sort, { ascending: opts.dir !== "desc" }).range(pg.from, pg.to);
  if (error) throw error;
  return { rows: data, meta: pageMeta(pg, count ?? 0) };
};

export const getVehicle = async (id) => {
  const { data, error } = await supabase.from("vehicles").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound("Vehicle not found");
  return data;
};

export const getVehicleHistory = async (id) => {
  const { data, error } = await supabase
    .from("service_requests").select("*, advisor:advisor_id ( full_name ), technician:technician_id ( full_name )")
    .eq("vehicle_id", id).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data;
};

export const assertCustomer = async (customerId) => {
  const { data, error } = await supabase.from("users").select("id, role").eq("id", customerId).maybeSingle();
  if (error) throw error;
  if (!data || data.role !== "Customer") throw ApiError.badRequest("Choose a valid customer");
};

export const createVehicle = async (input) => {
  const { data, error } = await supabase.from("vehicles").insert([input]).select(SELECT).single();
  if (error) throw friendly(error);
  return data;
};

export const updateVehicle = async (id, patch) => {
  if (!Object.keys(patch).length) throw ApiError.badRequest("Nothing to update");
  const { data, error } = await supabase.from("vehicles").update(patch).eq("id", id).select(SELECT).maybeSingle();
  if (error) throw friendly(error);
  if (!data) throw ApiError.notFound("Vehicle not found");
  return data;
};

export const deleteVehicle = async (id) => {
  const { count, error: cErr } = await supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("vehicle_id", id);
  if (cErr) throw cErr;
  if (count) throw ApiError.conflict("This vehicle has service records and cannot be deleted");
  const { data, error } = await supabase.from("vehicles").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error?.code === "23503" ? ApiError.conflict("This vehicle is linked to other records and cannot be deleted") : error;
  if (!data) throw ApiError.notFound("Vehicle not found");
};

/** True when the vehicle already has a request that is not finished or rejected. */
export const hasOpenRequest = async (vehicleId) => {
  const { count, error } = await supabase
    .from("service_requests").select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId).not("request_status", "in", `(${OPEN_STATUS_EXCLUDED.join(",")})`);
  if (error) throw error;
  return (count || 0) > 0;
};
