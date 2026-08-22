import React, { useState } from "react";
import { AlertTriangle, Cpu, Sparkles, Zap, Activity } from "lucide-react";
import { AIEngineMonitorModal, AIEngineMonitorButton } from "./AIEngineMonitorModal";

export function AIOfflineNotice({ receipt, traceLogs = [], className = "" }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!receipt) return null;

  const logs = traceLogs.length > 0 ? traceLogs : (receipt.ai_trace_logs || []);

  // Case 1: Switched to NVIDIA Cloud Vision Backup Engine
  if (receipt.ai_engine === "NVIDIA_VISION") {
    return (
      <>
        <div
          className={`ai-failover-banner ${className}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
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
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
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
                Primary Gemini Vision was unreachable. System automatically failed over to NVIDIA Vision AI to extract your receipt with full precision.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "4px 10px",
              backgroundColor: "#ffffff",
              border: "1px solid #86efac",
              borderRadius: "6px",
              color: "#15803d",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            View AI Trace ({logs.length})
          </button>
        </div>

        <AIEngineMonitorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          traceLogs={logs}
          receipt={receipt}
        />
      </>
    );
  }

  // Case 2: Both Cloud AIs failed -> Local OCR Fallback Warning
  if (receipt.ai_offline) {
    return (
      <>
        <div
          className={`ai-offline-banner ${className}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
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
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
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

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "4px 10px",
              backgroundColor: "#ffffff",
              border: "1px solid #fde68a",
              borderRadius: "6px",
              color: "#b45309",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Inspect Errors ({logs.length})
          </button>
        </div>

        <AIEngineMonitorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          traceLogs={logs}
          receipt={receipt}
        />
      </>
    );
  }

  return null;
}

export function AIEngineBadge({ receipt, traceLogs = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!receipt) return null;

  const logs = traceLogs.length > 0 ? traceLogs : (receipt.ai_trace_logs || []);

  if (receipt.ai_engine === "NVIDIA_VISION") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
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
            cursor: "pointer",
          }}
          title="Click to view AI Failover Trace & Key Diagnostics"
        >
          <Zap size={13} style={{ color: "#16a34a" }} /> NVIDIA Vision AI (Backup)
        </button>
        <AIEngineMonitorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          traceLogs={logs}
          receipt={receipt}
        />
      </>
    );
  }

  if (receipt.ai_offline) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
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
            cursor: "pointer",
          }}
          title="Click to inspect AI Key Errors and Failover Trace"
        >
          <Cpu size={12} /> Local OCR (AI Offline)
        </button>
        <AIEngineMonitorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          traceLogs={logs}
          receipt={receipt}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
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
          cursor: "pointer",
        }}
        title="Extracted using Google Gemini Multimodal Vision AI. Click to view AI key monitor."
      >
        <Sparkles size={12} /> Gemini Vision AI
      </button>
      <AIEngineMonitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        traceLogs={logs}
        receipt={receipt}
      />
    </>
  );
}

export { AIEngineMonitorModal, AIEngineMonitorButton };
