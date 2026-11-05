import {
  getRequests, getRequestsPage, getRequestById, approveRequest, rejectRequest, createRequest, updateRequestData, deleteRequestData,
} from "../services/request/requestService.js";
import supabase from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";
import { hasOpenRequest } from "../services/vehicle/vehicleService.js";
import { sendEmail } from "../services/email/emailService.js";

// Fields a client may never set directly.
const PRIVILEGED = [
  "id", "request_number", "request_status", "customer_id", "advisor_id", "manager_id",
  "technician_id", "created_at", "updated_at", "service_started_at", "service_completed_at",
];

const strip = (obj, keys) => {
  const out = { ...(obj || {}) };
  for (const k of keys) delete out[k];
  return out;
};

const canView = (user, request) => {
  if (["Admin", "Manager"].includes(user.role)) return true;
  if (user.role === "Customer") return String(request.customer_id) === String(user.id);
  if (user.role === "Service Advisor") return String(request.advisor_id) === String(user.id);
  return false;
};

export const getAllRequests = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === "Customer") filter.customerId = req.user.id;
    if (req.user.role === "Service Advisor") filter.advisorId = req.user.id;
    const q = req.valid?.query || {};
    if (q.page !== undefined) {
      const { rows, meta } = await getRequestsPage({ ...filter, ...q });
      return res.json({ success: true, data: rows, meta });
    }
    res.json({ success: true, data: await getRequests(filter) });
  } catch (e) { next(e); }
};

export const getSingleRequest = async (req, res, next) => {
  try {
    const request = await getRequestById(req.valid.params.id);
    if (!canView(req.user, request)) throw ApiError.forbidden();
    res.json({ success: true, data: request });
  } catch (e) {
    next(e?.code === "PGRST116" ? ApiError.notFound("Service request not found") : e);
  }
};

export const addRequest = async (req, res, next) => {
  try {
    const b = req.valid.body;
    let customerId = req.user.id;
    if (req.user.role === "Admin") {
      if (!b.customer_id) throw ApiError.badRequest("customer_id is required");
      customerId = b.customer_id;
    }
    const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10); // India date
    if (b.preferred_date < today) throw ApiError.badRequest("Choose today or a future date", { preferred_date: "must not be in the past" });

    // The vehicle must belong to the customer the request is for.
    const { data: vehicle, error } = await supabase
      .from("vehicles").select("id, customer_id, brand, model, registration_number").eq("id", b.vehicle_id).maybeSingle();
    if (error) throw error;
    if (!vehicle || String(vehicle.customer_id) !== String(customerId)) {
      throw ApiError.forbidden("Vehicle does not belong to this customer");
    }
    if (await hasOpenRequest(vehicle.id)) {
      throw ApiError.conflict("This vehicle already has an open service request. Wait for it to finish or contact the service centre");
    }

    const request = await createRequest({
      vehicle_id: vehicle.id, customer_id: customerId, service_type: b.service_type,
      preferred_date: b.preferred_date, preferred_time: b.preferred_time, customer_problem: b.customer_problem,
      request_status: "Pending",
    });
    const { data: customer } = await supabase.from("users").select("full_name, email").eq("id", customerId).maybeSingle();
    if (customer) void sendEmail("bookingConfirmation", customer.email, { name: customer.full_name, request, vehicle: `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})` });
    res.status(201).json({ success: true, data: request, message: "Booking received" });
  } catch (e) { next(e); }
};

export const updateRequest = async (req, res, next) => {
  try {
    const patch = strip(req.body, ["id", "request_number", "customer_id", "created_at"]);
    if (!Object.keys(patch).length) throw ApiError.badRequest("Nothing to update");
    const request = await updateRequestData(req.valid.params.id, patch);
    res.json({ success: true, data: request, message: "Request Updated Successfully" });
  } catch (e) {
    next(e?.code === "PGRST116" ? ApiError.notFound("Service request not found") : e);
  }
};

export const deleteRequest = async (req, res, next) => {
  try {
    await deleteRequestData(req.valid.params.id);
    res.json({ success: true, message: "Request Deleted Successfully" });
  } catch (e) { next(e); }
};

export const approve = async (req, res, next) => {
  try {
    const data = await approveRequest(req.valid.params.id, req.valid.body.advisor_id, req.user);
    void notifyDecision("requestApproved", data);
    res.json({ success: true, data, message: "Request approved" });
  } catch (e) { next(e); }
};

export const reject = async (req, res, next) => {
  try {
    const data = await rejectRequest(req.valid.params.id, req.valid.body.reason, req.user);
    void notifyDecision("requestRejected", data, req.valid.body.reason);
    res.json({ success: true, data, message: "Request rejected" });
  } catch (e) { next(e); }
};

// Best-effort customer email after a decision; failures are logged by sendEmail and never affect the response.
const notifyDecision = async (template, request, reason) => {
  try {
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from("users").select("full_name, email").eq("id", request.customer_id).maybeSingle(),
      supabase.from("vehicles").select("brand, model, registration_number").eq("id", request.vehicle_id).maybeSingle(),
    ]);
    if (c) await sendEmail(template, c.email, { name: c.full_name, request, reason, vehicle: v ? `${v.brand} ${v.model} (${v.registration_number})` : "" });
  } catch (e) { console.error("[email] decision notice failed:", e?.code || e?.message); }
};
