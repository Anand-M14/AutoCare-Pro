import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hook/useAuth";
import { homeFor } from "../lib/roles";

/**
 * <ProtectedRoute roles={["Admin"]} /> as a layout route.
 * UX guard only - the API enforces the same rules on the server.
 */
export default function ProtectedRoute({ roles }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <div className="ac-boot" role="status" aria-label="Loading" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
