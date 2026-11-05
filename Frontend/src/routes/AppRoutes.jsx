import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AppShell from "../components/shell/AppShell";
import { ROLES } from "../lib/roles";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import Overview from "../pages/overview/Overview";
import RoleHome from "../pages/home/RoleHome";
import People from "../pages/people/People";
import Vehicles from "../pages/vehicles/Vehicles";
import Requests from "../pages/requests/Requests";
import Reports from "../pages/reports/Reports";
import Jobs from "../pages/technician/Jobs";
import Account from "../pages/account/Account";

// One guarded section per role, all inside the same AutoCare Pro shell.
const section = (path, role, children) => (
  <Route path={path} element={<ProtectedRoute roles={[role]} />}>
    <Route element={<AppShell />}>
      {children}
      <Route path="account" element={<Account />} />
      <Route path="*" element={<Navigate to={path} replace />} />
    </Route>
  </Route>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {section("/admin", ROLES.ADMIN, <>
        <Route index element={<Overview />} />
        <Route path="requests" element={<Requests />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="customers" element={<People mode="customers" />} />
        <Route path="employees" element={<People mode="staff" />} />
      </>)}

      {section("/manager", ROLES.MANAGER, <>
        <Route index element={<Overview />} />
        <Route path="requests" element={<Requests />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customers" element={<People mode="customers" />} />
      </>)}

      {section("/advisor", ROLES.ADVISOR, <>
        <Route index element={<RoleHome />} />
        <Route path="requests" element={<Requests />} />
        <Route path="reports" element={<Reports />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="customers" element={<People mode="customers" />} />
      </>)}

      {section("/technician", ROLES.TECHNICIAN, <>
        <Route index element={<RoleHome />} />
        <Route path="requests" element={<Jobs />} />
      </>)}

      {section("/customer", ROLES.CUSTOMER, <>
        <Route index element={<RoleHome />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="requests" element={<Requests />} />
      </>)}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
