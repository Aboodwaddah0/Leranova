import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { AUTH_ROLES } from "../utils/constants";

export default function StudentProtectedRoute() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const role = useSelector((state) => state.auth.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Teachers (INSTRUCTOR) and org roles can preview student lesson pages
  const allowedRoles = [AUTH_ROLES.STUDENT, AUTH_ROLES.INSTRUCTOR, AUTH_ROLES.ORGANIZATION];
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}