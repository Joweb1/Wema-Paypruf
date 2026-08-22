import React from "react";
import { AlertTriangle, Cpu } from "lucide-react";

export function AIOfflineNotice({ receipt, className = "" }) {
  if (!receipt || !receipt.ai_offline) {
    return null;
  }

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
        borderRadius: "8px",
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

export function AIEngineBadge({ receipt }) {
  if (!receipt) return null;

  if (receipt.ai_offline) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "0.75rem",
          padding: "2px 8px",
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
        padding: "2px 8px",
        backgroundColor: "#ecfdf5",
        border: "1px solid #a7f3d0",
        borderRadius: "9999px",
        color: "#065f46",
        fontWeight: 600,
      }}
      title="Extracted using Google Gemini Multimodal Vision AI"
    >
      Gemini Vision AI
    </span>
  );
}
