// import supabase from "../config/supabase.js";

// export const getAdminDashboard = async (req, res) => {
//   try {

//     // Total Users
//     const { count: totalUsers, error: userError } =
//       await supabase
//         .from("users")
//         .select("*", {
//           count: "exact",
//           head: true,
//         });

//     // Total Vehicles
//     const { count: totalVehicles, error: vehicleError } =
//       await supabase
//         .from("vehicles")
//         .select("*", {
//           count: "exact",
//           head: true,
//         });

//     // Total Requests
//     const { count: totalRequests, error: requestError } =
//       await supabase
//         .from("service_requests")
//         .select("*", {
//           count: "exact",
//           head: true,
//         });

//     // Customers
//     const { count: customers, error: customerError } =
//       await supabase
//         .from("users")
//         .select("*", {
//           count: "exact",
//           head: true,
//         })
//         .eq("role", "Customer");
// // Employees
// const { data: employeeData, error: employeeError } =
// await supabase
//   .from("users")
//   .select("id")
//   .neq("role", "Customer");

// const employees = employeeData?.length || 0;

//     // Pending Requests
//     const { count: pendingRequests, error: pendingError } =
//       await supabase
//         .from("service_requests")
//         .select("*", {
//           count: "exact",
//           head: true,
//         })
//         .eq("request_status", "Pending");

//     // Recent Users
//     const { data: recentUsers, error: recentUsersError } =
//       await supabase
//         .from("users")
//         .select("id,full_name,email,role")
//         .order("created_at", {
//           ascending: false,
//         })
//         .limit(5);

//     // Recent Vehicles
//     const { data: recentVehicles, error: recentVehiclesError } =
//       await supabase
//         .from("vehicles")
//         .select("*")
//         .order("created_at", {
//           ascending: false,
//         })
//         .limit(5);

//     // Recent Requests
//     const { data: recentRequests, error: recentRequestError } =
//       await supabase
//         .from("service_requests")
//         .select(`
//           id,
//           request_number,
//           customer_id,
//           preferred_time,
//           request_status
//         `)
//         .order("created_at", {
//           ascending: false,
//         })
//         .limit(5);

//     // Error Check
//     if (
//       userError ||
//       vehicleError ||
//       requestError ||
//       customerError ||
//       pendingError ||
//       recentUsersError ||
//       recentVehiclesError ||
//       recentRequestError
//     ) {
//       console.log({
//         userError,
//         vehicleError,
//         requestError,
//         customerError,
//         pendingError,
//         recentUsersError,
//         recentVehiclesError,
//         recentRequestError,
//       });

//       return res.status(400).json({
//         success: false,
//         message: "Database Error",
//       });
//     }

//     // Response
//     return res.json({
//       success: true,
//       data: {
//         cards: {
//           totalUsers,
//           totalVehicles,
//           totalRequests,
//           customers,
//           employees,
//           pendingRequests,
//         },

//         recentUsers,

//         recentVehicles,

//         recentRequests:
//           recentRequests?.map((item) => ({
//             id: item.id,
//             requestNumber: item.request_number,
//             customerId: item.customer_id,
//             preferredTime: item.preferred_time,
//             status: item.request_status,
//           })) || [],
//       },
//     });

//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





import {
    getAdminDashboard
}
from "../services/dashboard/adminDashboard.js";


import {
    getManagerDashboard
}
from "../services/dashboard/managerDashboard.js";


import {
    getAdvisorDashboard
}
from "../services/dashboard/advisorDashboard.js";


import {
    getTechnicianDashboard
}
from "../services/dashboard/technicianDashboard.js";


import {
    getCustomerDashboard
}
from "../services/dashboard/customerDashboard.js";





export const getDashboardData = async(req,res)=>{


try{


const {role}=req.params;


const {userId}=req.query;



let data;


switch(role.toLowerCase()){


case "admin":

data = await getAdminDashboard();

break;


case "manager":

data = await getManagerDashboard(userId);

break;


case "advisor":

data = await getAdvisorDashboard(userId);

break;


case "technician":

data = await getTechnicianDashboard(userId);

break;


case "customer":

data = await getCustomerDashboard(userId);

break;


default:

return res.status(400).json({
success:false,
message:"Invalid Role"
});


}




return res.status(200).json({

success:true,

data

});



}
catch(error){


console.log(error);


return res.status(500).json({

success:false,

message:error.message

});


}



};