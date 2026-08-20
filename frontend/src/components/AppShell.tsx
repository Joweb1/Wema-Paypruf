import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Brand } from "./Brand";
import { RequireAuth } from "../auth/guards";
import { useAuth } from "../auth/AuthContext";

export function MerchantShell() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="shell-width topbar-inner">
          <Brand />
          <div className="topbar-actions">
            {isAuthenticated && user ? (
              <>
                <span className="environment-pill">
                  <ShieldCheck size={14} /> Wema demo environment
                </span>
                <Link className="nav-link" to="/dashboard">
                  <LayoutDashboard size={17} /> Dashboard
                </Link>
                <button
                  type="button"
                  className="nav-link button-ghost"
                  onClick={logout}
                >
                  <LogOut size={17} /> Log out
                </button>
              </>
            ) : (
              <>
                <span className="environment-pill">
                  <ShieldCheck size={14} /> Wema demo environment
                </span>
                <Link className="nav-link" to="/login">Sign in</Link>
                <Link className="nav-link" to="/register">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <RequireAuth>
        <main className="shell-width page-space">
          <Outlet />
        </main>
      </RequireAuth>
      <footer className="shell-width site-footer">
        <span>PayPruf</span>
        <span>Receipt intelligence is supporting evidence. Merchant-side records confirm payment.</span>
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
      <footer className="public-footer">PayPruf verifies payment claims against merchant-side transaction records.</footer>
    </div>
  );
}
