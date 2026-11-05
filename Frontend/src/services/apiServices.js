import api from "../lib/api";

// ---- dashboard
export const fetchOverview = (range) => api.get("/dashboard/overview", { params: { range } }).then((r) => r.data.data);

// ---- people (users table)
export const listUsers = (params) => api.get("/users", { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta }));
export const createUser = (body) => api.post("/users", body).then((r) => r.data);
export const updateUser = (id, body) => api.put(`/users/${id}`, body).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);

// ---- service requests
export const listRequests = (params) => api.get("/requests", { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta }));
export const getAdvisorOptions = () => api.get("/manager/advisors").then((r) => r.data.data || []);
export const approveRequest = (id, advisor_id) => api.post(`/requests/${id}/approve`, { advisor_id }).then((r) => r.data);
export const rejectRequest = (id, reason) => api.post(`/requests/${id}/reject`, { reason }).then((r) => r.data);

// ---- auth
export const registerCustomer = (body) => api.post("/auth/register", body).then((r) => r.data);

// ---- auth / account
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email }).then((r) => r.data);
export const resetPassword = (token, password) => api.post("/auth/reset-password", { token, password }).then((r) => r.data);
export const updateProfile = (body) => api.put("/auth/me", body).then((r) => r.data.data);
export const changePassword = (body) => api.post("/auth/change-password", body).then((r) => r.data);

// ---- role dashboards
export const fetchRoleHome = (role) => api.get(`/dashboard/${role}`).then((r) => r.data.data);

// ---- customers
export const getCustomer = (id) => api.get(`/users/${id}`).then((r) => r.data.data);

// ---- vehicles
export const listVehicles = (params) => api.get("/vehicles", { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta }));
export const createVehicle = (body) => api.post("/vehicles", body).then((r) => r.data.data);
export const updateVehicle = (id, body) => api.put(`/vehicles/${id}`, body).then((r) => r.data.data);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`).then((r) => r.data);
export const vehicleHistory = (id) => api.get(`/vehicles/${id}/history`).then((r) => r.data.data);

// ---- bookings
export const createBooking = (body) => api.post("/requests", body).then((r) => r.data.data);
export const getRequest = (id) => api.get(`/requests/${id}`).then((r) => r.data.data);

// ---- advisor
export const getTechnicianOptions = () => api.get("/advisor/technicians").then((r) => r.data.data || []);
export const assignTechnician = (requestId, technician_id) => api.put(`/advisor/assign-technician/${requestId}`, { technician_id }).then((r) => r.data);
export const advisorReports = (advisorId) => api.get("/advisor/reports", { params: { advisorId } }).then((r) => r.data.data || []);
export const verifyReport = (requestId, advisorId) => api.put(`/advisor/reports/${requestId}/verify`, { advisorId }).then((r) => r.data);

// ---- manager
export const managerReports = () => api.get("/manager/reports").then((r) => r.data.data || []);
export const approveReport = (requestId) => api.put(`/manager/reports/${requestId}/approve`, {}).then((r) => r.data);
export const assignAdvisor = (requestId, advisor_id) => api.put(`/manager/assign-advisor/${requestId}`, { advisor_id }).then((r) => r.data);

// ---- technician
export const myJobs = () => api.get("/technician/requests").then((r) => r.data.data || []);
export const startJob = (id) => api.put(`/technician/requests/${id}/start`, {}).then((r) => r.data);
export const completeJob = (id) => api.put(`/technician/requests/${id}/complete`, {}).then((r) => r.data);
export const submitReport = (id, body) => api.post(`/technician/requests/${id}/report`, body).then((r) => r.data);
export const myReport = (id) => api.get(`/technician/requests/${id}/report`).then((r) => r.data.data);
