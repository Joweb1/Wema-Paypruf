import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { MerchantShell, PublicShell } from "./components/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { CustomerPaymentPage } from "./pages/CustomerPaymentPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PaymentDetailsPage } from "./pages/PaymentDetailsPage";
import { PaymentLinkPage } from "./pages/PaymentLinkPage";
import { VerificationPage } from "./pages/VerificationPage";
import { LoginPage } from "./pages/LoginPage";
import { MerchantOnboardingPage } from "./pages/MerchantOnboardingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { GuestOnly, RequireAuth, RequireOnboarding } from "./auth/guards";
import { AuthProvider } from "./auth/AuthContext";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: "auto" }), [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/pay/:token" element={<CustomerPaymentPage />} />
          <Route path="/verification/:paymentId" element={<VerificationPage />} />
        </Route>
        <Route element={<MerchantShell />}>
          <Route
            path="/dashboard"
            element={
              <RequireOnboarding>
                <DashboardPage />
              </RequireOnboarding>
            }
          />
          <Route
            path="/payment-link/:paymentId"
            element={
              <RequireOnboarding>
                <PaymentLinkPage />
              </RequireOnboarding>
            }
          />
          <Route
            path="/payments/:paymentId"
            element={
              <RequireOnboarding>
                <PaymentDetailsPage />
              </RequireOnboarding>
            }
          />
        </Route>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route
          path="/merchant-onboarding"
          element={
            <RequireAuth>
              <MerchantOnboardingPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
