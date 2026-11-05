// Maps the workflow statuses already used by the backend to a badge tone + plain label.
const MAP = {
  Pending: ["wait", "Waiting for approval"],
  Approved: ["live", "Approved"],
  "Manager Approved": ["live", "Approved"],
  "Advisor Assigned": ["live", "Advisor assigned"],
  "Technician Assigned": ["live", "Technician assigned"],
  "Service Started": ["live", "In repair"],
  "Service Completed": ["live", "Repair finished"],
  "Report Submitted": ["alert", "Report to verify"],
  "Advisor Verified": ["live", "Verified"],
  "Vehicle Ready": ["done", "Ready for pickup"],
  Completed: ["done", "Completed"],
  Rejected: ["alert", "Rejected"],
};
export const statusInfo = (s) => MAP[s] || ["wait", s || "Unknown"];
export const STATUS_OPTIONS = Object.keys(MAP);

// The journey a request follows, in order. "Approved" is a legacy status treated as Advisor Assigned.
export const FLOW = [
  ["Pending", "Booked"],
  ["Advisor Assigned", "Approved"],
  ["Technician Assigned", "Technician assigned"],
  ["Service Started", "Repair started"],
  ["Service Completed", "Repair finished"],
  ["Report Submitted", "Report submitted"],
  ["Advisor Verified", "Report verified"],
  ["Manager Approved", "Quality approved"],
  ["Vehicle Ready", "Ready for pickup"],
  ["Completed", "Handed over"],
];
export const flowIndex = (status) => {
  const s = status === "Approved" ? "Advisor Assigned" : status;
  return FLOW.findIndex(([k]) => k === s);
};
export const isOpen = (s) => !["Completed", "Rejected"].includes(s);
