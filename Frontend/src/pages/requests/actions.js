import api from "../../lib/api";

export const markReady = (id) => api.put(`/advisor/requests/${id}/vehicle-ready`, {}).then((r) => r.data);
export const markHandedOver = (id) => api.put(`/advisor/requests/${id}/complete`, {}).then((r) => r.data);
