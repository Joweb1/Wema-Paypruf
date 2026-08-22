import { Outlet } from "react-router-dom";
import { Brand } from "./Brand";
import { Navbar } from "./Navbar";
import { ShieldCheck } from "lucide-react";
import { RequireAuth } from "../auth/guards";
import { useAuth } from "../auth/AuthContext";

export function MerchantShell() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <RequireAuth>
        <main className="shell-width page-space">
          <Outlet />
        </main>
      </RequireAuth>
      <footer className="shell-width site-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src="/wemalogo.jpg"
            alt="Wema Paypruf"
            style={{ height: "22px", width: "auto", objectFit: "contain", borderRadius: "4px" }}
          />
          <span style={{ fontWeight: 700 }}>PayPruf</span>
        </div>
        <span>
          Receipt intelligence is supporting evidence. Merchant-side records
          confirm payment.
        </span>
      </footer>
    </div>
  );
}

export function PublicShell() {
  return (
    <div className="public-shell">
      <header className="public-topbar shell-width">
        <Brand publicHome isHeader={true} />
        <span className="secure-note">
          <ShieldCheck size={16} aria-hidden="true" /> Secure payment verification
        </span>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <img
          src="/wemalogo.jpg"
          alt="Wema Paypruf"
          style={{ height: "18px", width: "auto", objectFit: "contain", borderRadius: "4px" }}
        />
        <span>PayPruf verifies payment claims against merchant-side transaction records.</span>
      </footer>
    </div>
  );
}
