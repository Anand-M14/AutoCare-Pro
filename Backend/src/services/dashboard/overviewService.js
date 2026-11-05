import supabase from "../../config/supabase.js";
import { LANES, TERMINAL } from "../../utils/workflow.js";

const head = (table) => supabase.from(table).select("id", { count: "exact", head: true });
const must = ({ count, error }) => { if (error) throw error; return count ?? 0; };

export const RANGES = { today: 1, "7d": 7, "30d": 30 };

/** Everything the admin/manager dashboard shows, computed from real rows. */
export const getOverview = async (range = "7d") => {
  const days = RANGES[range] ?? 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const laneCounts = Promise.all(
    LANES.map(async (l) => ({ ...l, count: must(await head("service_requests").in("request_status", l.statuses)) }))
  );

  const [customers, staff, vehicles, requests, completedAll, completedInRange, newCustomers, lanes, vehicleTypes, boardRows, recent] =
    await Promise.all([
      head("users").eq("role", "Customer").then(must),
      head("users").neq("role", "Customer").then(must),
      head("vehicles").then(must),
      head("service_requests").then(must),
      head("service_requests").eq("request_status", "Completed").then(must),
      head("service_requests").eq("request_status", "Completed").gte("service_completed_at", since).then(must),
      head("users").eq("role", "Customer").gte("created_at", since).then((r) => (r.error ? null : r.count ?? 0)),
      laneCounts,
      supabase.from("vehicles").select("vehicle_type").limit(10000),
      supabase
        .from("service_requests")
        .select("id, request_number, request_status, created_at, vehicle:vehicle_id(registration_number, vehicle_type, brand, model), customer:customer_id(full_name)")
        .not("request_status", "in", `(${TERMINAL.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("service_requests")
        .select("id, request_number, request_status, created_at, vehicle:vehicle_id(registration_number, vehicle_type), customer:customer_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (vehicleTypes.error) throw vehicleTypes.error;
  if (boardRows.error) throw boardRows.error;
  if (recent.error) throw recent.error;

  const byType = {};
  for (const v of vehicleTypes.data) {
    const t = (v.vehicle_type || "Other").toString().trim() || "Other";
    byType[t] = (byType[t] || 0) + 1;
  }

  const board = lanes.map((l) => ({
    key: l.key,
    label: l.label,
    statuses: l.statuses,
    count: l.count,
    items: boardRows.data.filter((r) => l.statuses.includes(r.request_status)).slice(0, 3),
  }));

  const inWorkshop = board.reduce((n, l) => n + l.count, 0);
  const oldestWaiting = boardRows.data.filter((r) => r.request_status === "Pending").map((r) => r.created_at).sort()[0] || null;

  return {
    range: { key: RANGES[range] ? range : "7d", days, since },
    totals: {
      customers, staff, vehicles, requests, inWorkshop,
      waitingApproval: board[0].count,
      completedAll, completedInRange, newCustomers,
    },
    oldestWaiting,
    vehiclesByType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    board,
    recentRequests: recent.data,
  };
};
