import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth";

export default function Auth() {
  const { user } = useAuth();

  // If user is already logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Redirect to new login page
  return <Navigate to="/auth/login" replace />;
}
