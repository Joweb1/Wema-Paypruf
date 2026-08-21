import React from "react";
import {
  Building2,
  ShieldCheck,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { PayPrufLogoIcon } from "./common/PayPrufLogoIcon";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="landing-page-footer"
      style={{
        background: "linear-gradient(180deg, #faf7fc 0%, #f4eef7 100%)",
        borderTop: "1px solid var(--line)",
        color: "var(--ink)",
        padding: "48px 24px 32px",
        marginTop: "48px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Main Content Row: Logo, Summary & Collaboration Card */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "32px",
            paddingBottom: "32px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          {/* Left: Brand Identity & Tagline */}
          <div style={{ maxWidth: "480px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <PayPrufLogoIcon size={44} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "var(--brand)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  PayPruf
                </span>
                <span
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--muted)",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  Payment & Receipt Intelligence
                </span>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: "var(--muted)",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              Instant Nigerian bank transfer verification, dynamic NIP virtual accounts, and OCR receipt intelligence for businesses and shoppers.
            </p>
          </div>

          {/* Right: In Collaboration With Wema Bank */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid var(--line-strong)",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 4px 16px rgba(123, 37, 131, 0.05)",
              flexShrink: 0,
              minWidth: "290px",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: "#ffffff",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
              }}
            >
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKlsAqTrP5Wm7XG7JF8v45kYaQxmIw001JvQ&s"
                alt="Wema Bank Logo"
                referrerPolicy="no-referrer"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "6px",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.innerHTML = `
                    <div style="font-weight:900;color:#982d8d;font-size:11px;text-align:center;line-height:1.2;">
                      WEMA<br/>BANK
                    </div>
                  `;
                }}
              />
            </div>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--brand)",
                  marginBottom: "3px",
                }}
              >
                <Building2 size={13} />
                In Collaboration With
              </div>
              <div
                style={{
                  fontSize: "1.02rem",
                  fontWeight: 800,
                  color: "var(--ink)",
                  marginBottom: "2px",
                }}
              >
                Wema Bank Plc
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                Direct NIP Clearing & Virtual Account Rails
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Clean Bar: Status & Copyright */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            paddingTop: "24px",
            fontSize: "0.82rem",
            color: "var(--muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <span>
              &copy; {currentYear} <strong>PayPruf Technologies</strong>. All rights reserved.
            </span>
            <span style={{ color: "var(--line-strong)" }}>•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--confirmed)",
                  display: "inline-block",
                }}
              />
              NIP Settlement Network Active
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#ffffff",
                border: "1px solid var(--line)",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              <ShieldCheck size={13} color="var(--confirmed)" />
              256-Bit Bank Grade Encryption
            </span>
            <span
              style={{
                background: "var(--brand-soft)",
                border: "1px solid rgba(123, 37, 131, 0.15)",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--brand)",
              }}
            >
              🇳🇬 Powered by Wema Bank Rails
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
