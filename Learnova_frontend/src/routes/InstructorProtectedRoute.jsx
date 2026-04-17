import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { AUTH_ROLES } from "../utils/constants";

export default function InstructorProtectedRoute() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const role = useSelector((state) => state.auth.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== AUTH_ROLES.INSTRUCTOR) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
