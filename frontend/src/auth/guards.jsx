import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "../components/AsyncState";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader label="Confirming your session" />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

export function RequireOnboarding({ children }) {
  const { merchantOnboardingCompleted, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader label="Confirming your session" />;
  }
  if (!merchantOnboardingCompleted) {
    return <Navigate to="/merchant-onboarding" replace />;
  }
  return children;
}

export function GuestOnly({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader label="Loading PayPruf" />;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
