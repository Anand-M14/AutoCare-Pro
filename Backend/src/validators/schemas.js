import { ROLE_VALUES, STATUS_VALUES } from "./validate.js";

export const loginSchema = {
  email: { type: "email", required: true },
  password: { type: "anyPassword", required: true },
};

export const createUserSchema = {
  full_name: { type: "string", min: 2, max: 100, required: true },
  email: { type: "email", required: true },
  phone: { type: "phone", required: true },
  password: { type: "password", required: true },
  role: { type: "enum", values: ROLE_VALUES, required: true },
  status: { type: "enum", values: STATUS_VALUES },
  profile_image: { type: "string", max: 500 },
};

export const updateUserSchema = {
  full_name: { type: "string", min: 2, max: 100 },
  email: { type: "email" },
  phone: { type: "phone" },
  password: { type: "password" },
  role: { type: "enum", values: ROLE_VALUES },
  status: { type: "enum", values: STATUS_VALUES },
  profile_image: { type: "string", max: 500 },
};

export const listUsersQuery = {
  page: { type: "int", min: 1, max: 1000000 },
  limit: { type: "int", min: 1, max: 100 },
  q: { type: "string", max: 80 },
  group: { type: "enum", values: ["customers", "staff"] },
  role: { type: "enum", values: ROLE_VALUES },
  status: { type: "enum", values: STATUS_VALUES },
  sort: { type: "enum", values: ["full_name", "email", "role", "status"] },
  dir: { type: "enum", values: ["asc", "desc"] },
  include: { type: "enum", values: ["vehicles"] },
};

export const registerSchema = {
  full_name: { type: "string", min: 2, max: 100, required: true },
  email: { type: "email", required: true },
  phone: { type: "phone", required: true },
  password: { type: "password", required: true },
};

// ---------- vehicles ----------
const VEHICLE_TYPES = ["Car", "Bike"];
export const vehicleFields = {
  registration_number: { type: "plate" },
  vehicle_type: { type: "enum", values: VEHICLE_TYPES },
  brand: { type: "string", min: 2, max: 60 },
  model: { type: "string", min: 1, max: 60 },
  color: { type: "string", max: 40 },
  chassis_number: { type: "string", min: 5, max: 40 },
  engine_number: { type: "string", min: 3, max: 40 },
};
export const createVehicleSchema = {
  ...vehicleFields,
  registration_number: { type: "plate", required: true },
  vehicle_type: { type: "enum", values: VEHICLE_TYPES, required: true },
  brand: { type: "string", min: 2, max: 60, required: true },
  model: { type: "string", min: 1, max: 60, required: true },
  customer_id: { type: "id" },
};
export const updateVehicleSchema = { ...vehicleFields };
export const listVehiclesQuery = {
  page: { type: "int", min: 1, max: 1000000 },
  limit: { type: "int", min: 1, max: 100 },
  q: { type: "string", max: 80 },
  type: { type: "enum", values: VEHICLE_TYPES },
  customer_id: { type: "id" },
  sort: { type: "enum", values: ["registration_number", "brand", "model", "vehicle_type"] },
  dir: { type: "enum", values: ["asc", "desc"] },
};

// ---------- booking ----------
export const bookingSchema = {
  vehicle_id: { type: "id", required: true },
  customer_id: { type: "id" },
  service_type: { type: "string", min: 3, max: 80, required: true },
  preferred_date: { type: "date", required: true },
  preferred_time: { type: "time", required: true },
  customer_problem: { type: "string", min: 5, max: 1000, required: true },
};

// ---------- profile / password ----------
export const profileSchema = {
  full_name: { type: "string", min: 2, max: 100 },
  phone: { type: "phone" },
  profile_image: { type: "string", max: 500 },
};
export const changePasswordSchema = {
  current_password: { type: "anyPassword", required: true },
  new_password: { type: "password", required: true },
};
export const forgotSchema = { email: { type: "email", required: true } };
export const resetSchema = {
  token: { type: "token", required: true },
  password: { type: "password", required: true },
};
