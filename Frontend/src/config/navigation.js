import { ROLES } from "../lib/roles";

// Only features that are actually built appear here. Each role sees only its own items.
const account = (base) => ({ name: "Profile", path: `${base}/account`, icon: "users" });

export const NAV = {
  [ROLES.ADMIN]: [
    { name: "Dashboard", path: "/admin", icon: "grid", end: true },
    { name: "Service requests", path: "/admin/requests", icon: "list" },
    { name: "Vehicles", path: "/admin/vehicles", icon: "car" },
    { name: "Customers", path: "/admin/customers", icon: "users" },
    { name: "Employees", path: "/admin/employees", icon: "badge" },
    account("/admin"),
  ],
  [ROLES.MANAGER]: [
    { name: "Dashboard", path: "/manager", icon: "grid", end: true },
    { name: "Requests", path: "/manager/requests", icon: "list" },
    { name: "Reports", path: "/manager/reports", icon: "clipboard" },
    { name: "Customers", path: "/manager/customers", icon: "users" },
    account("/manager"),
  ],
  [ROLES.ADVISOR]: [
    { name: "Work queue", path: "/advisor", icon: "grid", end: true },
    { name: "Requests", path: "/advisor/requests", icon: "list" },
    { name: "Reports", path: "/advisor/reports", icon: "clipboard" },
    { name: "Vehicles", path: "/advisor/vehicles", icon: "car" },
    { name: "Customers", path: "/advisor/customers", icon: "users" },
    account("/advisor"),
  ],
  [ROLES.TECHNICIAN]: [
    { name: "My bay", path: "/technician", icon: "grid", end: true },
    { name: "My jobs", path: "/technician/requests", icon: "wrench" },
    account("/technician"),
  ],
  [ROLES.CUSTOMER]: [
    { name: "Garage", path: "/customer", icon: "grid", end: true },
    { name: "My vehicles", path: "/customer/vehicles", icon: "car" },
    { name: "My bookings", path: "/customer/requests", icon: "list" },
    account("/customer"),
  ],
};
