// Status vocabulary already used by the existing advisor/manager/technician services.
export const LANES = [
  { key: "waiting", label: "Waiting for approval", statuses: ["Pending"] },
  { key: "assigned", label: "Approved and assigned", statuses: ["Approved", "Manager Approved", "Advisor Assigned", "Technician Assigned"] },
  { key: "repair", label: "In repair", statuses: ["Service Started"] },
  { key: "quality", label: "Quality check", statuses: ["Service Completed", "Report Submitted", "Advisor Verified"] },
  { key: "ready", label: "Ready for pickup", statuses: ["Vehicle Ready"] },
];
export const TERMINAL = ["Completed", "Rejected"];
export const ALL_STATUSES = [...LANES.flatMap((l) => l.statuses), ...TERMINAL];
