import { getOverview } from "../services/dashboard/overviewService.js";

export const overview = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getOverview(req.valid?.query?.range) });
  } catch (e) { next(e); }
};
