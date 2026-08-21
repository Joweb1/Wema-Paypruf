import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ShieldCheck,
  Search,
  LogOut,
  LogIn,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "./Brand";
import { AccountVerificationModal } from "./AccountVerificationModal";
import { AccountRiskModal } from "./AccountRiskModal";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [selectedRiskAccount, setSelectedRiskAccount] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Close profile dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  const handleNavigateToUpload = (accountName) => {
    setIsAccountModalOpen(false);
    navigate(`/receipt-upload/${encodeURIComponent(accountName)}`);
  };

  const handleOpenRiskModal = (acc = "") => {
    setIsAccountModalOpen(false);
    setSelectedRiskAccount(acc || "");
    setIsRiskModalOpen(true);
  };

  const getInitials = (u) => {
    if (!u) return "TF";
    const name = u.businessName || u.fullName || u.accountName || u.email || "TF";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="topbar">
        <div className="shell-width topbar-inner">
          {/* Brand Logo */}
          <Brand
            publicHome={
              !user &&
              (location.pathname === "/" ||
                location.pathname === "/login" ||
                location.pathname === "/register")
            }
          />

          {/* Header Navigation Actions */}
          <div className="topbar-actions">
            {user ? (
              <>
                {/* 1. Home icon that navigates to the landing page */}
                <Link
                  id="nav-home"
                  to="/"
                  className="nav-link"
                  title="Landing Page"
                  aria-label="Landing Page"
                >
                  <Home size={18} />
                </Link>

                {/* 2. Search icon button with Verify label text */}
                <button
                  id="nav-verify"
                  type="button"
                  onClick={() => setIsAccountModalOpen(true)}
                  className="nav-link"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  <Search size={17} />
                  <span>Verify</span>
                </button>

                {/* 3. Profile Avatar Icon Button */}
                <div className="profile-menu-container" ref={profileMenuRef}>
                  <button
                    id="nav-profile-avatar-btn"
                    type="button"
                    className="topbar-avatar-btn"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    aria-label="User Profile & Account Menu"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="true"
                    title={user.businessName || user.fullName || "Merchant Profile"}
                  >
                    <span>{getInitials(user)}</span>
                  </button>

                  {isProfileMenuOpen && (
                    <div className="profile-dropdown" role="menu">
                      <div className="profile-dropdown-header">
                        <div className="profile-dropdown-name">
                          {user.businessName || user.fullName || "Tola Fashion"}
                        </div>
                        <div className="profile-dropdown-meta">
                          {user.wemaAccountNumber
                            ? `Wema: ${user.wemaAccountNumber}`
                            : user.email || "Merchant Account"}
                        </div>
                      </div>

                      <Link
                        to="/dashboard"
                        className="profile-dropdown-item"
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <LayoutDashboard size={16} />
                        <span>Dashboard Overview</span>
                      </Link>

                      <button
                        type="button"
                        className="profile-dropdown-item danger"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut size={16} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* 1. Check account risk icon button */}
                <button
                  id="nav-check-account-risk-public"
                  type="button"
                  onClick={() => handleOpenRiskModal("")}
                  className="nav-link"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  title="Check Account Risk"
                  aria-label="Check Account Risk"
                >
                  <ShieldCheck size={17} />
                  <span>Check Account Risk</span>
                </button>

                {/* 2. Verify payment icon button */}
                <button
                  id="nav-verify-payment-public"
                  type="button"
                  onClick={() => setIsAccountModalOpen(true)}
                  className="nav-link"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  title="Verify Payment"
                  aria-label="Verify Payment"
                >
                  <Search size={17} />
                  <span>Verify Payment</span>
                </button>

                {/* 3. Sign In button */}
                <Link
                  id="nav-signin-public"
                  className="button button-primary nav-signin-btn"
                  to="/login"
                  title="Sign in"
                >
                  <LogIn size={16} />
                  <span>Sign in</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Account Verification Modal */}
      <AccountVerificationModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onNavigateToUpload={handleNavigateToUpload}
        onNavigateToCheckRisk={handleOpenRiskModal}
      />

      {/* Account Risk Modal */}
      <AccountRiskModal
        isOpen={isRiskModalOpen}
        onClose={() => {
          setIsRiskModalOpen(false);
          setSelectedRiskAccount("");
        }}
        initialAccountNumber={selectedRiskAccount}
      />
    </>
  );
};

