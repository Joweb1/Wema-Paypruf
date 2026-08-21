import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building2,
  FileCheck2,
  Lock,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Navbar } from "../components/Navbar";
import { AccountVerificationModal } from "../components/AccountVerificationModal";
import { AccountRiskModal } from "../components/AccountRiskModal";
import { LandingFooter } from "../components/LandingFooter";

const TAGLINE_SEQUENCE = [
  "Every Payment Verified. Every Transaction Tracked.",
  "Every Payment Verified. Every Business Protected.",
  "Receipts Checked. Payments Confirmed.",
  "Receipts Verified. Payments Reconciled.",
  "Payments Verified. Transactions Reconciled.",
  "Verify the Receipt. Confirm the Payment.",
  "Don’t Just See the Receipt. Verify the Payment.",
  "Real Payments. Verified Transactions.",
  "Verified Payments. Smarter Business.",
  "Verified Payments. Safer Transactions.",
];

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [selectedRiskAccount, setSelectedRiskAccount] = useState("");

  // Typewriter animation state
  const [displayedTag, setDisplayedTag] = useState("");
  const [tagIndex, setTagIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentTag = TAGLINE_SEQUENCE[tagIndex % TAGLINE_SEQUENCE.length];
    let timer;

    if (!isDeleting) {
      // Typing forward
      if (displayedTag.length < currentTag.length) {
        timer = setTimeout(() => {
          setDisplayedTag(currentTag.slice(0, displayedTag.length + 1));
        }, 55);
      } else {
        // Full string typed, pause before deleting
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1800);
      }
    } else {
      // Deleting backward letter by letter
      if (displayedTag.length > 0) {
        timer = setTimeout(() => {
          setDisplayedTag(currentTag.slice(0, displayedTag.length - 1));
        }, 28);
      } else {
        // Completely deleted, small pause then next tag
        timer = setTimeout(() => {
          setIsDeleting(false);
          setTagIndex((prev) => (prev + 1) % TAGLINE_SEQUENCE.length);
        }, 350);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedTag, isDeleting, tagIndex]);

  const handleNavigateToUpload = (accountName) => {
    setIsModalOpen(false);
    navigate(`/receipt-upload/${encodeURIComponent(accountName)}`);
  };

  const handleNavigateToCheckRisk = (accountName) => {
    setIsModalOpen(false);
    setSelectedRiskAccount(accountName || "");
    setIsRiskModalOpen(true);
  };

  return (
    <div className="landing-hero-page">
      <Navbar currentView="landing" />

      {/* Hero Section */}
      <section className="landing-hero-section">
        {/* Background Visual Layers & Vector Graphics */}
        <div className="hero-bg-layer" aria-hidden="true">
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <div className="hero-glow hero-glow-3" />

          {/* Super Cool Vector Grid & Orbit Mesh (Slightly less visible for sleek subtlety) */}
          <svg
            className="hero-vector-svg"
            viewBox="0 0 1440 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Radial Fade Mask for Grid */}
              <radialGradient id="hero-vector-mask" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <mask id="hero-grid-mask">
                <rect width="1440" height="800" fill="url(#hero-vector-mask)" />
              </mask>

              {/* Grid Pattern */}
              <pattern
                id="hero-tech-grid"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 48 0 L 0 0 0 48"
                  fill="none"
                  stroke="#7b2583"
                  strokeWidth="0.75"
                  strokeOpacity="0.35"
                />
                <circle cx="0" cy="0" r="1.5" fill="#7b2583" fillOpacity="0.4" />
              </pattern>

              {/* Vector Gradients */}
              <linearGradient id="orbit-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7b2583" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#982d8d" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="orbit-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#982d8d" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#7b2583" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7b2583" stopOpacity="0" />
                <stop offset="50%" stopColor="#982d8d" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#7b2583" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Background Tech Grid with Radial Fade */}
            <rect
              width="1440"
              height="800"
              fill="url(#hero-tech-grid)"
              mask="url(#hero-grid-mask)"
            />

            {/* Concentric Verification Orbital Vectors */}
            <g className="hero-orbit-group" transform="translate(720, 290)">
              {/* Outer Orbit */}
              <circle
                cx="0"
                cy="0"
                r="360"
                stroke="url(#orbit-grad-1)"
                strokeWidth="1.2"
                strokeDasharray="4 8"
              />
              {/* Mid Orbit */}
              <circle
                cx="0"
                cy="0"
                r="270"
                stroke="url(#orbit-grad-2)"
                strokeWidth="1.4"
                strokeDasharray="8 6"
              />
              {/* Inner Orbit */}
              <circle
                cx="0"
                cy="0"
                r="180"
                stroke="url(#orbit-grad-1)"
                strokeWidth="1"
                strokeDasharray="2 6"
              />
              {/* Center Halo Ring */}
              <circle
                cx="0"
                cy="0"
                r="100"
                stroke="#7b2583"
                strokeOpacity="0.18"
                strokeWidth="1"
              />

              {/* Orbit Crosshairs & Node Ticks */}
              <line x1="-380" y1="0" x2="-340" y2="0" stroke="#7b2583" strokeOpacity="0.3" strokeWidth="1.5" />
              <line x1="340" y1="0" x2="380" y2="0" stroke="#7b2583" strokeOpacity="0.3" strokeWidth="1.5" />
              <line x1="0" y1="-380" x2="0" y2="-340" stroke="#7b2583" strokeOpacity="0.3" strokeWidth="1.5" />
              <line x1="0" y1="340" x2="0" y2="380" stroke="#7b2583" strokeOpacity="0.3" strokeWidth="1.5" />

              {/* Orbit Satellite Nodes */}
              <circle cx="-191" cy="-191" r="3.5" fill="#7b2583" fillOpacity="0.45" />
              <circle cx="191" cy="191" r="3.5" fill="#982d8d" fillOpacity="0.45" />
              <circle cx="270" cy="0" r="4" fill="#7b2583" fillOpacity="0.5" />
              <circle cx="-270" cy="0" r="4" fill="#7b2583" fillOpacity="0.5" />
            </g>

            {/* Floating Geometric Wireframe Vectors */}
            {/* Top Left Floating Isometric Cube */}
            <g className="hero-float-vector hero-float-1" transform="translate(180, 110)">
              <polygon
                points="40,10 75,28 40,46 5,28"
                fill="none"
                stroke="#7b2583"
                strokeWidth="1.2"
                strokeOpacity="0.35"
              />
              <polygon
                points="5,28 40,46 40,82 5,64"
                fill="#7b2583"
                fillOpacity="0.04"
                stroke="#7b2583"
                strokeWidth="1.2"
                strokeOpacity="0.35"
              />
              <polygon
                points="75,28 40,46 40,82 75,64"
                fill="#982d8d"
                fillOpacity="0.06"
                stroke="#982d8d"
                strokeWidth="1.2"
                strokeOpacity="0.35"
              />
            </g>

            {/* Top Right Floating Shield Outline */}
            <g className="hero-float-vector hero-float-2" transform="translate(1220, 140)">
              <path
                d="M30 10 L55 22 V48 C55 68 30 82 30 82 C30 82 5 68 5 48 V22 Z"
                fill="#7b2583"
                fillOpacity="0.04"
                stroke="#7b2583"
                strokeWidth="1.4"
                strokeOpacity="0.35"
              />
              <path
                d="M20 44 L27 51 L41 37"
                fill="none"
                stroke="#7b2583"
                strokeWidth="1.6"
                strokeOpacity="0.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Bottom Left Verification Hexagon */}
            <g className="hero-float-vector hero-float-3" transform="translate(240, 520)">
              <polygon
                points="30,5 55,20 55,50 30,65 5,50 5,20"
                fill="#982d8d"
                fillOpacity="0.03"
                stroke="#7b2583"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                strokeOpacity="0.3"
              />
              <circle cx="30" cy="35" r="5" fill="#7b2583" fillOpacity="0.25" />
            </g>

            {/* Bottom Right Floating Ledger Node */}
            <g className="hero-float-vector hero-float-4" transform="translate(1160, 500)">
              <polygon
                points="35,10 65,26 35,42 5,26"
                fill="none"
                stroke="#982d8d"
                strokeWidth="1.2"
                strokeOpacity="0.3"
              />
              <polygon
                points="5,26 35,42 35,74 5,58"
                fill="#7b2583"
                fillOpacity="0.04"
                stroke="#7b2583"
                strokeWidth="1.2"
                strokeOpacity="0.3"
              />
              <polygon
                points="65,26 35,42 35,74 65,58"
                fill="#982d8d"
                fillOpacity="0.05"
                stroke="#982d8d"
                strokeWidth="1.2"
                strokeOpacity="0.3"
              />
            </g>

            {/* Accent Cross Nodes */}
            <g opacity="0.4" stroke="#7b2583" strokeWidth="1.2">
              <path d="M 420 180 v 10 M 415 185 h 10" />
              <path d="M 1020 220 v 10 M 1015 225 h 10" />
              <path d="M 360 420 v 10 M 355 425 h 10" />
              <path d="M 1080 440 v 10 M 1075 445 h 10" />
            </g>
          </svg>
        </div>

        {/* Floating Trust Badges */}
        <div className="hero-badge hero-badge-left">
          <span className="hero-badge-icon">
            <Zap size={18} />
          </span>
          <div>
            <span className="hero-badge-label">Instant Verification</span>
            <strong>Under 10 seconds</strong>
          </div>
        </div>

        <div className="hero-badge hero-badge-right">
          <span className="hero-badge-icon hero-badge-icon-rose">
            <ShieldCheck size={18} />
          </span>
          <div>
            <span className="hero-badge-label">Bank-Grade Truth</span>
            <strong>Wema Ledger Matched</strong>
          </div>
        </div>

        {/* Main Content */}
        <div className="hero-content">
          {/* Tagline Badge with Rotational Typewriter Animation */}
          <div className="hero-tagline-badge" aria-label="Verification Guarantee">
            <span className="hero-pulse-dot" aria-hidden="true">
              <span className="hero-ping" />
              <span className="hero-static-dot" />
            </span>
            <span className="hero-tagline-text">
              {displayedTag}
              <span className="hero-tagline-cursor" aria-hidden="true" />
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="hero-headline">
            <span>Don’t trust the Receipt.</span>
            <span className="hero-headline-accent">Verify the Payment</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            PayPruf helps online vendors, merchants, and small businesses verify
            payment receipts, match transfers with bank records, and prevent payment
            disputes.
          </p>

          {/* Call to Actions */}
          <div className="hero-actions">
            <button
              id="hero-verify-payment-btn"
              onClick={() => setIsModalOpen(true)}
              className="hero-btn hero-btn-primary"
            >
              Verify Payment
              <ArrowRight size={18} />
            </button>
            {user ? (
              <Link
                id="hero-dashboard-btn"
                to="/dashboard"
                className="hero-btn hero-btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
            ) : (
              <Link
                id="hero-get-started-btn"
                to="/register"
                className="hero-btn hero-btn-secondary"
              >
                Create Merchant Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ padding: "64px 24px", maxWidth: "1180px", margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span className="eyebrow">Why Nigerian Merchants Trust PayPruf</span>
          <h2 style={{ fontSize: "2.2rem", margin: "8px 0" }}>
            The Complete Anti-Fraud Payment Solution
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: "600px", margin: "0 auto" }}>
            Combining AI OCR extraction with merchant bank reconciliation.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          <div className="content-card" style={{ padding: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "var(--brand-soft)",
                color: "var(--brand)",
                display: "grid",
                placeItems: "center",
                marginBottom: "20px",
              }}
            >
              <FileCheck2 size={24} />
            </div>
            <h3 style={{ fontSize: "1.2rem", margin: "0 0 10px" }}>
              Intelligent OCR Extraction
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              Instantly scans uploaded receipts, transfer slips, and screenshots across all Nigerian banks to extract amount, sender, and reference.
            </p>
          </div>

          <div className="content-card" style={{ padding: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "var(--confirmed-soft)",
                color: "var(--confirmed)",
                display: "grid",
                placeItems: "center",
                marginBottom: "20px",
              }}
            >
              <Building2 size={24} />
            </div>
            <h3 style={{ fontSize: "1.2rem", margin: "0 0 10px" }}>
              Direct Bank Ledger Match
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              Reconciles with incoming Wema NIP settlements. Never ship goods based on a forged image alone.
            </p>
          </div>

          <div className="content-card" style={{ padding: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "var(--pending-soft)",
                color: "var(--pending)",
                display: "grid",
                placeItems: "center",
                marginBottom: "20px",
              }}
            >
              <Lock size={24} />
            </div>
            <h3 style={{ fontSize: "1.2rem", margin: "0 0 10px" }}>
              Instant Shareable Links
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              Send custom WhatsApp & SMS payment links to customers with automatic receipt collection and real-time status updates.
            </p>
          </div>
        </div>
      </section>

      {/* Landing Page Footer */}
      <LandingFooter />

      {/* Account Verification Modal */}
      <AccountVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigateToUpload={handleNavigateToUpload}
        onNavigateToCheckRisk={handleNavigateToCheckRisk}
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
    </div>
  );
}

export default LandingPage;
