import { markVehicleReady, markHandedOver } from "../services/advisor/finalSteps.js";

export const vehicleReady = async (req, res, next) => {
  try { res.json({ success: true, data: await markVehicleReady(req.params.requestId), message: "Vehicle marked ready" }); } catch (e) { next(e); }
};
export const handedOver = async (req, res, next) => {
  try { res.json({ success: true, data: await markHandedOver(req.params.requestId), message: "Service completed" }); } catch (e) { next(e); }
};
