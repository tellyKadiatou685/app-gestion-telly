// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import AuthService from "@/services/Authservice";

interface Props {
  allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: Props) => {
  const user = AuthService.getStoredUser();

  if (!user || !AuthService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirige vers son propre dashboard plutôt qu'une page d'erreur
    switch (user.role) {
      case "ADMIN":       return <Navigate to="/dashboard/admin" replace />;
      case "SUPERVISEUR": return <Navigate to="/dashboard/superviseur" replace />;
      case "PARTENAIRE":  return <Navigate to="/dashboard/partenaire" replace />;
      default:            return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;