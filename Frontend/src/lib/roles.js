// Role names match users_role_check in the database exactly.
export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  ADVISOR: "Service Advisor",
  TECHNICIAN: "Technician",
  CUSTOMER: "Customer",
};

export const ROLE_HOME = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.MANAGER]: "/manager",
  [ROLES.ADVISOR]: "/advisor",
  [ROLES.TECHNICIAN]: "/technician",
  [ROLES.CUSTOMER]: "/customer",
};

export const homeFor = (role) => ROLE_HOME[role] || "/login";
