import supabase from "../../config/supabase.js";
import { ApiError } from "../../utils/ApiError.js";

// Moves a request one step forward, only from the expected status, and only once (conditional update).
const advance = async (requestId, from, to) => {
  const { data, error } = await supabase.from("service_requests")
    .update({ request_status: to }).eq("id", requestId).eq("request_status", from).select().maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.conflict(`This request is not in "${from}" status`);
  return data;
};

export const markVehicleReady = (id) => advance(id, "Manager Approved", "Vehicle Ready");
export const markHandedOver = (id) => advance(id, "Vehicle Ready", "Completed");
