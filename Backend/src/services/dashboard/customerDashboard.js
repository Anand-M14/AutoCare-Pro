import { countWhere, countByStatus, recent } from "./roleData.js";

const OPEN = ["Pending", "Advisor Assigned", "Technician Assigned", "Service Started", "Service Completed", "Report Submitted", "Advisor Verified", "Manager Approved", "Approved"];

export const getCustomerDashboard = async (userId) => {
  const [vehicles, open, ready, completed, rows] = await Promise.all([
    countWhere("vehicles", (q) => q.eq("customer_id", userId)),
    countByStatus("customer_id", userId, OPEN),
    countByStatus("customer_id", userId, ["Vehicle Ready"]),
    countByStatus("customer_id", userId, ["Completed"]),
    recent((q) => q.eq("customer_id", userId), 5),
  ]);
  return { cards: { vehicles, open, ready, completed }, recentRequests: rows };
};
