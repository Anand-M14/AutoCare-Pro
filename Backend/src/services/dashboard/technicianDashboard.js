import { countByStatus, recent } from "./roleData.js";

export const getTechnicianDashboard = async (userId) => {
  const [toStart, inProgress, reportDue, done, rows] = await Promise.all([
    countByStatus("technician_id", userId, ["Technician Assigned"]),
    countByStatus("technician_id", userId, ["Service Started"]),
    countByStatus("technician_id", userId, ["Service Completed"]),
    countByStatus("technician_id", userId, ["Report Submitted", "Advisor Verified", "Manager Approved", "Vehicle Ready", "Completed"]),
    recent((q) => q.eq("technician_id", userId).not("request_status", "in", "(Rejected)")),
  ]);
  return { cards: { toStart, inProgress, reportDue, done }, recentRequests: rows };
};
