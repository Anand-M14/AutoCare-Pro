import { ApiError } from "../utils/ApiError.js";
import * as svc from "../services/vehicle/vehicleService.js";

const isCustomer = (u) => u.role === "Customer";
const owns = (user, vehicle) => !isCustomer(user) || String(vehicle.customer_id) === String(user.id);

export const list = async (req, res, next) => {
  try {
    const { rows, meta } = await svc.getVehiclesPage(req.valid?.query || {}, isCustomer(req.user) ? { customerId: req.user.id } : {});
    res.json({ success: true, data: rows, meta });
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const v = await svc.getVehicle(req.valid.params.id);
    if (!owns(req.user, v)) throw ApiError.forbidden();
    res.json({ success: true, data: v });
  } catch (e) { next(e); }
};

export const history = async (req, res, next) => {
  try {
    const v = await svc.getVehicle(req.valid.params.id);
    if (!owns(req.user, v)) throw ApiError.forbidden();
    res.json({ success: true, data: await svc.getVehicleHistory(v.id) });
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const body = { ...req.valid.body };
    if (isCustomer(req.user)) body.customer_id = req.user.id;
    if (!body.customer_id) throw ApiError.badRequest("Choose the customer this vehicle belongs to");
    await svc.assertCustomer(body.customer_id);
    res.status(201).json({ success: true, message: "Vehicle added", data: await svc.createVehicle(body) });
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const v = await svc.getVehicle(req.valid.params.id);
    if (!owns(req.user, v)) throw ApiError.forbidden();
    res.json({ success: true, message: "Vehicle updated", data: await svc.updateVehicle(v.id, req.valid.body) });
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const v = await svc.getVehicle(req.valid.params.id);
    if (!owns(req.user, v)) throw ApiError.forbidden();
    await svc.deleteVehicle(v.id);
    res.json({ success: true, message: "Vehicle deleted" });
  } catch (e) { next(e); }
};
