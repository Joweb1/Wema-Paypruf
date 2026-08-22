import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { api } from "../../services/api";

export function AIEngineMonitorButton({
  traceLogs = [],
  receipt = null,
  onClick,
  className = "",
}) {
  const isFailover =
    receipt?.ai_engine === "NVIDIA_VISION" ||
    traceLogs.some((l) => l.status === "SWITCHING" || l.status?.startsWith("HTTP"));
  const isOffline = receipt?.ai_offline;

  let badgeColor = "#059669";
  let bg = "#ecfdf5";
  let border = "#a7f3d0";
  let text = "AI Monitor: Gemini Vision";

  if (receipt?.ai_engine === "NVIDIA_VISION") {
    badgeColor = "#16a34a";
    bg = "#f0fdf4";
    border = "#86efac";
    text = "AI Monitor: NVIDIA Vision (Backup)";
  } else if (isOffline) {
    badgeColor = "#d97706";
    bg = "#fffbeb";
    border = "#fde68a";
    text = "AI Monitor: Local OCR (Offline)";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`ai-monitor-trigger-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: "9999px",
        color: badgeColor,
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      title="Click to view backend AI key switching, failover logs, and live health diagnostics"
    >
      <Activity size={13} className="animate-pulse" />
      <span>{text}</span>
      {traceLogs.length > 0 && (
        <span
          style={{
            backgroundColor: isFailover ? "#fef3c7" : "#d1fae5",
            color: isFailover ? "#b45309" : "#065f46",
            padding: "1px 6px",
            borderRadius: "10px",
            fontSize: "0.7rem",
          }}
        >
          {traceLogs.length} events
        </span>
      )}
    </button>
  );
}

export function AIEngineMonitorModal({
  isOpen,
  onClose,
  traceLogs = [],
  receipt = null,
}) {
  const [isTestingLive, setIsTestingLive] = useState(false);
  const [liveTestResults, setLiveTestResults] = useState(null);
  const [activeTab, setActiveTab] = useState("trace"); // 'trace' | 'health'

  if (!isOpen) return null;

  const handleRunLiveTest = async () => {
    try {
      setIsTestingLive(true);
      const res = await fetch("/api/v1/ai-monitor/test-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setLiveTestResults(data);
      }
    } catch (err) {
      console.error("Failed to ping AI keys live:", err);
    } finally {
      setIsTestingLive(false);
    }
  };

  const currentEngine = receipt?.ai_engine || "GEMINI_VISION";
  const isOffline = receipt?.ai_offline;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #f8fafc, #f1f5f9)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: currentEngine === "NVIDIA_VISION" ? "#dcfce7" : (isOffline ? "#fef3c7" : "#ecfdf5"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: currentEngine === "NVIDIA_VISION" ? "#16a34a" : (isOffline ? "#d97706" : "#059669"),
              }}
            >
              {currentEngine === "NVIDIA_VISION" ? <Zap size={20} /> : (isOffline ? <Cpu size={20} /> : <Sparkles size={20} />)}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                AI Key Failover & Engine Monitor
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                Live execution trace across Google Gemini, NVIDIA Cloud NIM, and Local OCR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: "12px 24px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Active Processor:</span>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                backgroundColor: currentEngine === "NVIDIA_VISION" ? "#dcfce7" : (isOffline ? "#fef3c7" : "#d1fae5"),
                color: currentEngine === "NVIDIA_VISION" ? "#15803d" : (isOffline ? "#b45309" : "#065f46"),
                border: `1px solid ${currentEngine === "NVIDIA_VISION" ? "#86efac" : (isOffline ? "#fde68a" : "#a7f3d0")}`,
              }}
            >
              {currentEngine === "NVIDIA_VISION"
                ? "⚡ NVIDIA Cloud Vision AI"
                : isOffline
                ? "⚙️ Local RapidOCR Fallback"
                : "✨ Google Gemini Vision AI"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("trace")}
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                borderRadius: "6px",
                border: "none",
                fontWeight: activeTab === "trace" ? 700 : 500,
                backgroundColor: activeTab === "trace" ? "#0f172a" : "#e2e8f0",
                color: activeTab === "trace" ? "#ffffff" : "#475569",
                cursor: "pointer",
              }}
            >
              Receipt Trace ({traceLogs.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("health");
                if (!liveTestResults) handleRunLiveTest();
              }}
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                borderRadius: "6px",
                border: "none",
                fontWeight: activeTab === "health" ? 700 : 500,
                backgroundColor: activeTab === "health" ? "#0f172a" : "#e2e8f0",
                color: activeTab === "health" ? "#ffffff" : "#475569",
                cursor: "pointer",
              }}
            >
              Live Keys Health
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "trace" ? (
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#334155" }}>
                Step-by-Step AI Execution Trace
              </h4>

              {traceLogs.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#94a3b8",
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <Activity size={32} style={{ margin: "0 auto 8px auto", display: "block", color: "#cbd5e1" }} />
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>
                    No execution trace logs recorded for this receipt yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {traceLogs.map((log, index) => {
                    const isSuccess = log.status === "SUCCESS";
                    const isFail = log.status?.startsWith("HTTP") || log.status?.includes("ERROR") || log.status?.includes("TIMEOUT");
                    const isSwitch = log.status === "SWITCHING";

                    let borderCol = "#e2e8f0";
                    let bgCol = "#f8fafc";
                    let textCol = "#1e293b";
                    let badgeCol = "#64748b";

                    if (isSuccess) {
                      borderCol = "#86efac";
                      bgCol = "#f0fdf4";
                      textCol = "#166534";
                      badgeCol = "#15803d";
                    } else if (isFail) {
                      borderCol = "#fecdd3";
                      bgCol = "#fff1f2";
                      textCol = "#9f1239";
                      badgeCol = "#e11d48";
                    } else if (isSwitch) {
                      borderCol = "#bae6fd";
                      bgCol = "#f0f9ff";
                      textCol = "#0369a1";
                      badgeCol = "#0284c7";
                    }

                    return (
                      <div
                        key={index}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bgCol,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        <div style={{ marginTop: "2px", flexShrink: 0 }}>
                          {isSuccess ? (
                            <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
                          ) : isFail ? (
                            <AlertCircle size={18} style={{ color: "#e11d48" }} />
                          ) : isSwitch ? (
                            <ArrowRight size={18} style={{ color: "#0284c7" }} />
                          ) : (
                            <Activity size={18} style={{ color: "#64748b" }} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "4px",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: textCol }}>
                              {log.tier || log.step || "AI Execution Step"}
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {log.key_masked && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    color: "#475569",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {log.key_masked}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: "#ffffff",
                                  color: badgeCol,
                                  border: `1px solid ${borderCol}`,
                                }}
                              >
                                {log.status}
                                {log.latency_ms ? ` (${log.latency_ms}ms)` : ""}
                              </span>
                            </div>
                          </div>

                          <p style={{ margin: 0, fontSize: "0.8rem", color: textCol, lineHeight: 1.4 }}>
                            {log.message || log.error_detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#334155" }}>
                    Live AI Providers Health Matrix
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Pings all configured API keys & backup models in real-time
                  </span>
                </div>
                <button
                  onClick={handleRunLiveTest}
                  disabled={isTestingLive}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: isTestingLive ? "not-allowed" : "pointer",
                    opacity: isTestingLive ? 0.7 : 1,
                  }}
                >
                  {isTestingLive ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  <span>{isTestingLive ? "Pinging Keys..." : "Test All Keys Now"}</span>
                </button>
              </div>

              {isTestingLive && !liveTestResults && (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: "#0284c7" }} />
                  <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
                    Testing live connection to Gemini and NVIDIA endpoints...
                  </p>
                </div>
              )}

              {liveTestResults && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {liveTestResults.diagnostics?.map((diag, idx) => {
                    const isOk = diag.healthy;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "10px",
                          border: `1px solid ${isOk ? "#86efac" : "#fecdd3"}`,
                          backgroundColor: isOk ? "#f0fdf4" : "#fff1f2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {isOk ? (
                            <CheckCircle2 size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
                          ) : (
                            <AlertCircle size={20} style={{ color: "#e11d48", flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "0.875rem", color: isOk ? "#166534" : "#9f1239" }}>
                                {diag.provider} · {diag.tier}
                              </strong>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  fontFamily: "monospace",
                                }}
                              >
                                {diag.key_masked}
                              </span>
                            </div>
                            <span style={{ fontSize: "0.75rem", color: isOk ? "#15803d" : "#be123c", display: "block" }}>
                              {isOk
                                ? `Working with model: ${diag.active_model} (${diag.latency_ms}ms)`
                                : diag.error_detail || diag.status}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: isOk ? "#dcfce7" : "#ffe4e6",
                            color: isOk ? "#15803d" : "#be123c",
                            border: `1px solid ${isOk ? "#86efac" : "#fda4af"}`,
                          }}
                        >
                          {diag.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f5f9",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            🔒 Automatic 3-tier failover ensures 99.9% uptime for receipt processing.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
