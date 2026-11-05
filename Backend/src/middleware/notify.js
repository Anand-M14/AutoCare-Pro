import supabase from "../config/supabase.js";
import { sendEmail } from "../services/email/emailService.js";

// Customer-facing wording per workflow event.
const CUSTOMER = {
  advisorAssigned: null,
  technicianAssigned: ["A technician is assigned", "a technician has been assigned to your vehicle and the work will start soon."],
  serviceStarted: ["Work has started", "our technician has started working on your vehicle."],
  serviceCompleted: ["Repair work finished", "the repair work on your vehicle is finished. We are completing final checks."],
  vehicleReady: ["Your vehicle is ready", "your vehicle is ready for pickup. Please visit the service centre."],
  completed: ["Service completed", "your vehicle has been handed over. Thank you for choosing us."],
};

const load = async (requestId) => {
  const { data } = await supabase.from("service_requests")
    .select("*, customer:customer_id ( full_name, email ), technician:technician_id ( full_name, email ), vehicle:vehicle_id ( brand, model, registration_number )")
    .eq("id", requestId).maybeSingle();
  return data;
};

const dispatch = async (event, requestId) => {
  const r = await load(requestId);
  if (!r) return;
  const vehicle = r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model} (${r.vehicle.registration_number})` : "";
  if (event === "technicianAssigned" && r.technician?.email) {
    await sendEmail("jobAssigned", r.technician.email, { name: r.technician.full_name, request: r, vehicle });
  }
  const words = CUSTOMER[event];
  if (words && r.customer?.email) {
    await sendEmail("statusUpdate", r.customer.email, { name: r.customer.full_name, request: r, vehicle, headline: words[0], message: words[1] });
  }
};

/** Sends workflow emails after the route replied 200. Never delays or fails the response. */
export const notifyOnSuccess = (event, param = "requestId") => (req, res, next) => {
  const id = req.params[param];
  res.on("finish", () => {
    if (res.statusCode === 200) dispatch(event, id).catch((e) => console.error("[email] workflow notice failed:", e?.code || e?.message));
  });
  next();
};
