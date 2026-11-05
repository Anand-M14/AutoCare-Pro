import supabase from "../../config/supabase.js";
import { cleanSearch, pageMeta, parsePage } from "../../utils/query.js";

// ==============================
// GET REQUEST BY ID
// ==============================

export const getRequestById = async (id) => {

  const { data, error } = await supabase
    .from("service_requests")
    .select(`
      *,
      customer:customer_id (
        full_name,
        email,
        phone
      ),
      vehicle:vehicle_id (
        brand,
        model,
        vehicle_type,
        registration_number,
        color
      ),
      advisor:advisor_id (
        full_name
      ),
      technician:technician_id (
        full_name
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
};

// ==============================
// GET ALL REQUESTS
// ==============================
const LIST_SELECT = `
      *,
      customer:customer_id ( full_name, email, phone ),
      vehicle:vehicle_id ( brand, model, vehicle_type, registration_number ),
      advisor:advisor_id ( full_name ),
      technician:technician_id ( full_name )
    `;

/** Paginated, filterable list. `filter` may carry customerId / advisorId (role scoping) plus status, q, sort, dir. */
export const getRequestsPage = async (filter) => {
  const pg = parsePage(filter, { defaultLimit: 10, maxLimit: 100 });
  const sortable = ["created_at", "request_number", "request_status"];
  const sort = sortable.includes(filter.sort) ? filter.sort : "created_at";

  let q = supabase.from("service_requests").select(LIST_SELECT, { count: "exact" });
  if (filter.customerId) q = q.eq("customer_id", filter.customerId);
  if (filter.advisorId) q = q.eq("advisor_id", filter.advisorId);
  if (filter.status) q = q.eq("request_status", filter.status);
  const term = cleanSearch(filter.q);
  if (term) q = q.ilike("request_number", `%${term}%`);

  const { data, count, error } = await q.order(sort, { ascending: filter.dir === "asc" }).range(pg.from, pg.to);
  if (error) throw error;
  return { rows: data, meta: pageMeta(pg, count ?? 0) };
};

export const getRequests = async (filter = {}) => {

  let query = supabase
    .from("service_requests")
    .select(`
      *,
      customer:customer_id (
        full_name
      ),
      vehicle:vehicle_id (
        brand,
        model,
        vehicle_type
      ),
      advisor:advisor_id (
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  if (filter.customerId) query = query.eq("customer_id", filter.customerId);
  if (filter.advisorId) query = query.eq("advisor_id", filter.advisorId);

  const { data, error } = await query;

  if (error) throw error;

  return data;
};
// ==============================
// CREATE REQUEST
// ==============================

export const createRequest = async (requestData) => {

  // Next number = highest existing + 1 (count + 1 collides after deletions).
  // Retries if two bookings race on the UNIQUE(request_number) constraint.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: last, error: lastError } = await supabase
      .from("service_requests")
      .select("request_number")
      .order("request_number", { ascending: false })
      .limit(1);

    if (lastError) throw lastError;

    const lastNo = parseInt(String(last?.[0]?.request_number || "").replace(/\D/g, ""), 10) || 0;
    const request_number = `SR${String(lastNo + 1 + attempt).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("service_requests")
      .insert([{ ...requestData, request_number }])
      .select()
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error;
  }

  throw new Error("Could not allocate a request number, please retry");
};

// ==============================
// UPDATE REQUEST
// ==============================

export const updateRequestData = async (id, requestData) => {
  const { data, error } = await supabase
    .from("service_requests")
    .update(requestData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};

// ==============================
// DELETE REQUEST
// ==============================

export const deleteRequestData = async (id) => {
  const { error } = await supabase
    .from("service_requests")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
// ==============================
// APPROVE / REJECT (validated transitions: only a Pending request can be decided)
// ==============================
import { ApiError } from "../../utils/ApiError.js";

const decide = async (id, patch) => {
  const { data, error } = await supabase
    .from("service_requests")
    .update(patch)
    .eq("id", id)
    .eq("request_status", "Pending") // atomic: loses the race => 0 rows
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: current, error: e2 } = await supabase.from("service_requests").select("request_status").eq("id", id).maybeSingle();
  if (e2) throw e2;
  if (!current) throw ApiError.notFound("Service request not found");
  throw ApiError.conflict(`This request is already ${current.request_status} and can no longer be decided`);
};

export const approveRequest = async (id, advisorId, actor) => {
  const { data: advisor, error } = await supabase
    .from("users").select("id, role, status").eq("id", advisorId).maybeSingle();
  if (error) throw error;
  if (!advisor || advisor.role !== "Service Advisor") throw ApiError.badRequest("Choose a valid service advisor");
  if (String(advisor.status || "").toLowerCase() === "inactive") throw ApiError.badRequest("That advisor's account is inactive");
  const patch = { advisor_id: advisorId, request_status: "Advisor Assigned" };
  if (actor.role === "Manager") patch.manager_id = actor.id;
  return decide(id, patch);
};

export const rejectRequest = async (id, reason, actor) => {
  const patch = { request_status: "Rejected", rejection_reason: reason };
  if (actor.role === "Manager") patch.manager_id = actor.id;
  return decide(id, patch);
};
