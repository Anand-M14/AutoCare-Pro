import { listTechnicianRequests, getTechnicianReport } from "../services/technician/technicianService.js";

// A technician only ever sees jobs assigned to them (identity comes from the token, never the query).
export const listMine = async (req, res, next) => {
  try { res.json({ success: true, data: await listTechnicianRequests(req.user.id) }); } catch (e) { next(e); }
};

export const readReport = async (req, res, next) => {
  try { res.json({ success: true, data: await getTechnicianReport(req.params.requestId, req.user.id) }); } catch (e) { next(e); }
};
