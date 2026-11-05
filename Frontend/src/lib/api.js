import axios from "axios";
import { session } from "./session";

export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const isLogin = error.config?.url?.includes("/auth/login");
    if (status === 401 && !isLogin) {
      session.clear();
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  }
);

/** Human-readable message from any axios error. */
export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ERR_NETWORK") return "Cannot reach the server. Check your connection and that the API is running.";
  if (error?.code === "ECONNABORTED") return "The server took too long to respond.";
  return fallback;
};

export default api;
