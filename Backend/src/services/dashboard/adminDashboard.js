import supabase from "../../config/supabase.js";



export const getAdminDashboard = async()=>{


try{


const {count:totalUsers}
=
await supabase
.from("users")
.select("*",
{
count:"exact",
head:true
});




const {count:totalVehicles}
=
await supabase
.from("vehicles")
.select("*",
{
count:"exact",
head:true
});




const {count:totalRequests}
=
await supabase
.from("service_requests")
.select("*",
{
count:"exact",
head:true
});




const {count:customers}
=
await supabase
.from("users")
.select("*",
{
count:"exact",
head:true
})
.eq(
"role",
"Customer"
);




const {data:employeeData}
=
await supabase
.from("users")
.select("id")
.neq(
"role",
"Customer"
);



const employees =
employeeData?.length || 0;




const {count:pendingRequests}
=
await supabase
.from("service_requests")
.select("*",
{
count:"exact",
head:true
})
.eq(
"request_status",
"Pending"
);




const {data:recentUsers}
=
await supabase
.from("users")
.select(
"id,full_name,email,role"
)
.order(
"created_at",
{
ascending:false
}
)
.limit(5);





const {data:recentVehicles}
=
await supabase
.from("vehicles")
.select("*")
.order(
"created_at",
{
ascending:false
}
)
.limit(5);





const {data:recentRequests}
=
await supabase
.from("service_requests")
.select(`
id,
request_number,
customer_id,
service_type,
preferred_time,
request_status
`)
.order(
"created_at",
{
ascending:false
}
)
.limit(5);




return {


cards:{

totalUsers,

totalVehicles,

totalRequests,

customers,

employees,

pendingRequests

},


recentUsers,


recentVehicles,


recentRequests

};



}
catch(error){


throw error;


}



};