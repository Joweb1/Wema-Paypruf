import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { GuestOnly, RequireAuth, RequireOnboarding } from "./auth/guards";
import { MerchantShell, PublicShell } from "./components/AppShell";
import { ToastRegion } from "./components/Toast";
import { ToastProvider } from "./hooks/useToast";
import { CustomerPaymentPage } from "./pages/CustomerPaymentPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { MerchantOnboardingPage } from "./pages/MerchantOnboardingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PaymentDetailsPage } from "./pages/PaymentDetailsPage";
import { PaymentLinkPage } from "./pages/PaymentLinkPage";
import { ReceiptUploadPage } from "./pages/ReceiptUploadByAccountPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerificationPage } from "./pages/VerificationPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public marketing landing page */}
              <Route path="/" element={<LandingPage />} />

              {/* Guest Auth routes */}
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

              {/* Onboarding */}
              <Route
                path="/merchant-onboarding"
                element={
                  <RequireAuth>
                    <MerchantOnboardingPage />
                  </RequireAuth>
                }
              />

              {/* Merchant authenticated shell */}
              <Route
                element={
                  <RequireAuth>
                    <MerchantShell />
                  </RequireAuth>
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <RequireOnboarding>
                      <DashboardPage />
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
                <Route
                  path="/payment-link/:paymentId"
                  element={
                    <RequireOnboarding>
                      <PaymentLinkPage />
                    </RequireOnboarding>
                  }
                />
              </Route>

              {/* Public customer payment and verification pages */}
              <Route element={<PublicShell />}>
                <Route path="/pay/:token" element={<CustomerPaymentPage />} />
                <Route
                  path="/verification/:token"
                  element={<VerificationPage />}
                />
              </Route>

              {/* Account direct upload routes */}
              <Route
                path="/receipt-upload/:accountName"
                element={<ReceiptUploadPage />}
              />
              <Route
                path="/check-risk/:accountName"
                element={<ReceiptUploadPage />}
              />

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <ToastRegion />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
