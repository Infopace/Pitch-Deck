import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "@/stores/authStore";

/** Sits inside AuthGuard — assumes the visitor is already logged in, and
 * additionally requires role === "admin". A non-admin is bounced to the
 * regular dashboard rather than shown a 403 page. */
export function AdminGuard() {
  const user = useCurrentUser();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
