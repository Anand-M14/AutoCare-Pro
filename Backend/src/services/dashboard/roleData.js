import supabase from "../../config/supabase.js";

const REQ = "id, request_number, request_status, service_type, preferred_date, preferred_time, created_at, vehicle:vehicle_id ( registration_number, vehicle_type, brand, model ), customer:customer_id ( full_name )";

export const countWhere = async (table, apply) => {
  const { count, error } = await apply(supabase.from(table).select("id", { count: "exact", head: true }));
  if (error) throw error;
  return count || 0;
};

export const recent = async (apply, limit = 6) => {
  const { data, error } = await apply(supabase.from("service_requests").select(REQ)).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
};

export const countByStatus = (field, id, statuses) =>
  countWhere("service_requests", (q) => q.eq(field, id).in("request_status", statuses));
