import supabase from "../../config/supabase.js";

export const getManagerDashboard = async (userId) => {

  // Total Vehicles
  const { count: totalVehicles } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true });

  // Active Services
  const { count: activeServices } = await supabase
    .from("service_requests")
    .select("*", { count: "exact", head: true })
    .in("request_status", [
      "Approved",
      "Advisor Assigned",
      "Technician Assigned",
      "Inspection",
      "Repair",
      "Testing",
    ]);

  // Completed Services
  const { count: completed } = await supabase
    .from("service_requests")
    .select("*", { count: "exact", head: true })
    .eq("request_status", "Completed");

  // Vehicle Ready
  const { count: vehicleReady } = await supabase
    .from("service_requests")
    .select("*", { count: "exact", head: true })
    .eq("request_status", "Vehicle Ready");

  return {

    cards: {
      totalVehicles: totalVehicles || 0,
      activeServices: activeServices || 0,
      revenue: 0,
    },

    services: [
      {
        name: "Completed",
        value: completed || 0,
      },
      {
        name: "Vehicle Ready",
        value: vehicleReady || 0,
      },
    ],

    revenue: [],

    activity: [],

    performance: {
      completed: completed || 0,
      pending: activeServices || 0,
    },

  };

};