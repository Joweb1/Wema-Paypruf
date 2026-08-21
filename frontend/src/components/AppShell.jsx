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
      <footer className="shell-width site-footer">
        <span>PayPruf</span>
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
        <Brand publicHome />
        <span className="secure-note">
          <ShieldCheck size={16} aria-hidden="true" /> Secure payment verification
        </span>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer">
        PayPruf verifies payment claims against merchant-side transaction
        records.
      </footer>
    </div>
  );
}
