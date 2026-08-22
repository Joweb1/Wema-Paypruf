import React from "react";
import { AlertTriangle, Cpu, Sparkles, Zap } from "lucide-react";

export function AIOfflineNotice({ receipt, className = "" }) {
  if (!receipt) return null;

  // Case 1: Switched to NVIDIA Cloud Vision Backup Engine
  if (receipt.ai_engine === "NVIDIA_VISION") {
    return (
      <div
        className={`ai-failover-banner ${className}`}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          padding: "12px 16px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "10px",
          color: "#166534",
          marginBottom: "16px",
          fontSize: "0.875rem",
          lineHeight: "1.4",
        }}
        role="status"
      >
        <Zap
          size={20}
          style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }}
        />
        <div>
          <div style={{ fontWeight: 600, color: "#14532d", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Switched to Backup AI Engine</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 6px",
                backgroundColor: "#dcfce7",
                border: "1px solid #bbf7d0",
                borderRadius: "4px",
                color: "#15803d",
                fontWeight: 600,
              }}
            >
              NVIDIA Cloud Vision
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#166534" }}>
            Primary Gemini Vision was unreachable. System automatically failed over to NVIDIA Nemotron Vision AI to extract your receipt with full precision.
          </p>
        </div>
      </div>
    );
  }

  // Case 2: Both Cloud AIs failed -> Local OCR Fallback Warning
  if (receipt.ai_offline) {
    return (
      <div
        className={`ai-offline-banner ${className}`}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          padding: "12px 16px",
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "10px",
          color: "#92400e",
          marginBottom: "16px",
          fontSize: "0.875rem",
          lineHeight: "1.4",
        }}
        role="alert"
      >
        <AlertTriangle
          size={20}
          style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }}
        />
        <div>
          <div style={{ fontWeight: 600, color: "#78350f", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>AI Vision Offline</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 6px",
                backgroundColor: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: "4px",
                color: "#b45309",
                fontWeight: 500,
              }}
            >
              Local OCR Fallback
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#92400e" }}>
            Cloud AI could not be reached. Report was generated using local fallback OCR; extracted figures and reference might have reduced accuracy. Manual review is recommended.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function AIEngineBadge({ receipt }) {
  if (!receipt) return null;

  if (receipt.ai_engine === "NVIDIA_VISION") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "0.75rem",
          padding: "3px 10px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "9999px",
          color: "#15803d",
          fontWeight: 700,
        }}
        title="Extracted using NVIDIA Cloud Vision AI (Secondary Failover Engine)"
      >
        <Zap size={13} style={{ color: "#16a34a" }} /> NVIDIA Vision AI (Backup)
      </span>
    );
  }

  if (receipt.ai_offline) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "0.75rem",
          padding: "3px 10px",
          backgroundColor: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: "9999px",
          color: "#b45309",
          fontWeight: 600,
        }}
        title="Processed via local fallback OCR (AI cloud unreachable)"
      >
        <Cpu size={12} /> Local OCR (AI Offline)
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.75rem",
        padding: "3px 10px",
        backgroundColor: "#ecfdf5",
        border: "1px solid #a7f3d0",
        borderRadius: "9999px",
        color: "#065f46",
        fontWeight: 600,
      }}
      title="Extracted using Google Gemini Multimodal Vision AI"
    >
      <Sparkles size={12} /> Gemini Vision AI
    </span>
  );
}
