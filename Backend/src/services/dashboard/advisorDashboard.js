import { countByStatus, recent } from "./roleData.js";

export const getAdvisorDashboard = async (userId) => {
  const [awaitingTechnician, inRepair, reportsToVerify, completed, rows] = await Promise.all([
    countByStatus("advisor_id", userId, ["Advisor Assigned"]),
    countByStatus("advisor_id", userId, ["Technician Assigned", "Service Started", "Service Completed"]),
    countByStatus("advisor_id", userId, ["Report Submitted"]),
    countByStatus("advisor_id", userId, ["Advisor Verified", "Manager Approved", "Vehicle Ready", "Completed"]),
    recent((q) => q.eq("advisor_id", userId)),
  ]);
  return { cards: { awaitingTechnician, inRepair, reportsToVerify, completed }, recentRequests: rows };
};
