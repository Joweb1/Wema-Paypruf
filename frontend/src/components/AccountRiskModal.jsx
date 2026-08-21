import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  Building2,
  CheckCircle2,
  Info,
  Clock,
  UserCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { api, getErrorMessage } from "../services/api";

export function AccountRiskModal({
  isOpen,
  onClose,
  initialAccountNumber = "",
}) {
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [accountLookup, setAccountLookup] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCheckingRisk, setIsCheckingRisk] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  // Sync initial account number if passed
  useEffect(() => {
    if (initialAccountNumber) {
      setAccountNumber(initialAccountNumber);
      handleLookup(initialAccountNumber);
    }
  }, [initialAccountNumber]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (riskResult) {
          setRiskResult(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, riskResult]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (riskResult) {
        setRiskResult(null);
      } else {
        onClose();
      }
    }
  };

  const formatAccountNumber = (val) => {
    return String(val || "").replace(/\D/g, "").slice(0, 10);
  };

  const handleLookup = async (accNum) => {
    const clean = formatAccountNumber(accNum);
    if (clean.length < 10) {
      setAccountLookup(null);
      return;
    }

    setIsLookingUp(true);
    setError(null);
    try {
      const data = await api.lookupAccount(clean);
      setAccountLookup(data);
    } catch (err) {
      setAccountLookup(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAccountNumberChange = (e) => {
    const raw = e.target.value;
    const clean = formatAccountNumber(raw);
    setAccountNumber(clean);
    setError(null);
    setRiskResult(null);

    if (clean.length === 10) {
      handleLookup(clean);
    } else {
      setAccountLookup(null);
    }
  };

  const handleCheckRisk = async () => {
    const clean = formatAccountNumber(accountNumber);
    if (clean.length < 10) {
      setError("Please enter a valid 10-digit merchant account number.");
      return;
    }

    setIsCheckingRisk(true);
    setError(null);
    try {
      const result = await api.checkAccountRisk(clean);
      setRiskResult(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCheckingRisk(false);
    }
  };

  const handleReset = () => {
    setAccountNumber("");
    setAccountLookup(null);
    setRiskResult(null);
    setError(null);
  };

  const handleSampleSelect = (accNum) => {
    setAccountNumber(accNum);
    setError(null);
    setRiskResult(null);
    handleLookup(accNum);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="risk-modal-title"
    >
      <div
        className="modal-card"
        ref={modalRef}
        style={{ maxWidth: riskResult ? "540px" : "490px" }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Risk Intelligence</span>
            <h2 id="risk-modal-title">
              {riskResult
                ? riskResult.hasReports
                  ? "Account Risk Assessment"
                  : "Verified Record: Clean"
                : "Check Account Risk"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {!riskResult ? (
            <div>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.88rem",
                  marginTop: 0,
                  marginBottom: "16px",
                  lineHeight: 1.5,
                }}
              >
                Scan our crowd-sourced Nigerian merchant risk registry for fraud
                reports, disputed transactions, or fake receipt flags before
                making transfers.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckRisk();
                }}
              >
                <div className="field" style={{ marginBottom: "14px" }}>
                  <label htmlFor="risk-account-number-input">
                    Merchant Wema Account Number <b aria-hidden="true">*</b>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      id="risk-account-number-input"
                      placeholder="e.g. 0123456789"
                      value={accountNumber}
                      onChange={handleAccountNumberChange}
                      maxLength={10}
                      autoComplete="off"
                      disabled={isCheckingRisk}
                      style={{
                        paddingRight: isLookingUp ? "40px" : "14px",
                      }}
                    />
                    {isLookingUp && (
                      <span
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                        }}
                      >
                        Checking...
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Account Name Detection Banner */}
                {accountLookup && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: accountLookup.registered
                        ? "var(--brand-soft)"
                        : "var(--paper-subtle, #f8fafc)",
                      border: accountLookup.registered
                        ? "1px solid var(--brand-line, #f0abfc)"
                        : "1px solid var(--line)",
                      marginBottom: "16px",
                    }}
                  >
                    <Building2
                      size={18}
                      color={accountLookup.registered ? "var(--brand)" : "var(--muted)"}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: accountLookup.registered
                            ? "var(--brand)"
                            : "var(--muted)",
                        }}
                      >
                        {accountLookup.registered
                          ? "Verified PayPruf Merchant"
                          : "Commercial Account"}
                      </div>
                      <strong
                        style={{
                          fontSize: "0.92rem",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {accountLookup.accountName}
                      </strong>
                    </div>
                    {accountLookup.registered && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "var(--brand)",
                          background: "#fff",
                          padding: "3px 8px",
                          borderRadius: "12px",
                        }}
                      >
                        <UserCheck size={12} /> Registered
                      </span>
                    )}
                  </div>
                )}

                {error && (
                  <div className="inline-alert" role="alert" style={{ marginBottom: "14px" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="button button-primary"
                  style={{ width: "100%", padding: "12px" }}
                  disabled={isCheckingRisk || accountNumber.length < 10}
                >
                  {isCheckingRisk ? (
                    "Querying Risk Intelligence..."
                  ) : (
                    <>
                      <Search size={16} /> Check Risk
                    </>
                  )}
                </button>
              </form>

              {/* Sample Test Accounts */}
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: "8px",
                  }}
                >
                  Test Risk Intelligence Demo:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleSampleSelect("0123456789")}
                    className="button button-ghost"
                    style={{ fontSize: "0.78rem", padding: "4px 10px", height: "auto" }}
                  >
                    <ShieldCheck size={13} color="var(--confirmed)" /> 0123456789 (Clean)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSampleSelect("0987654321")}
                    className="button button-ghost"
                    style={{ fontSize: "0.78rem", padding: "4px 10px", height: "auto" }}
                  >
                    <AlertTriangle size={13} color="var(--mismatch)" /> 0987654321 (4 Reports)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSampleSelect("5544332211")}
                    className="button button-ghost"
                    style={{ fontSize: "0.78rem", padding: "4px 10px", height: "auto" }}
                  >
                    <AlertTriangle size={13} color="var(--mismatch)" /> 5544332211 (2 Reports)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Risk Result Card */
            <div>
              {/* Clean / No Reports Case */}
              {!riskResult.hasReports ? (
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "16px",
                    background: "var(--confirmed-soft)",
                    border: "1px solid var(--confirmed-line, #bbf7d0)",
                    textAlign: "center",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "#fff",
                      color: "var(--confirmed)",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)",
                    }}
                  >
                    <ShieldCheck size={28} />
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--confirmed)",
                      background: "#fff",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    No Incidents on Record
                  </span>

                  <h3
                    style={{
                      margin: "4px 0 6px",
                      fontSize: "1.25rem",
                      color: "#065f46",
                    }}
                  >
                    No Community Reports Found
                  </h3>

                  <p
                    style={{
                      margin: "0 auto 12px",
                      fontSize: "0.88rem",
                      color: "#047857",
                      maxWidth: "380px",
                      lineHeight: 1.5,
                    }}
                  >
                    PayPruf has no reported incidents associated with this account.
                  </p>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#fff",
                      padding: "6px 14px",
                      borderRadius: "10px",
                      fontSize: "0.84rem",
                    }}
                  >
                    <Building2 size={15} color="var(--muted)" />
                    <strong>{riskResult.accountName}</strong>
                    <span style={{ color: "var(--muted)" }}>
                      ({riskResult.accountNumber})
                    </span>
                  </div>
                </div>
              ) : (
                /* Flagged / Reports Found Case */
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "16px",
                    background: "var(--mismatch-soft)",
                    border: "1px solid var(--mismatch-line, #fecdd3)",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "12px",
                        background: "#fff",
                        color: "var(--mismatch)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(225, 29, 72, 0.15)",
                      }}
                    >
                      <AlertTriangle size={26} />
                    </div>
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--mismatch)",
                          background: "#fff",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          marginBottom: "4px",
                        }}
                      >
                        Community Alert: {riskResult.reportCount} Report(s) Found
                      </span>
                      <h3
                        style={{
                          margin: "2px 0 4px",
                          fontSize: "1.18rem",
                          color: "#9f1239",
                        }}
                      >
                        Caution Advised: Account Flagged
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.86rem",
                          color: "#be123c",
                          lineHeight: 1.45,
                        }}
                      >
                        This account has received reports from other users.
                        Exercise caution.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#fff",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontSize: "0.84rem",
                      marginBottom: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>
                        Queried Merchant Account
                      </span>
                      <strong>{riskResult.accountName}</strong>
                    </div>
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {riskResult.accountNumber}
                    </span>
                  </div>

                  {/* Filed Incidents List */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      borderRadius: "12px",
                      padding: "14px",
                      border: "1px solid rgba(225, 29, 72, 0.12)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#9f1239",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: "10px",
                      }}
                    >
                      <Clock size={14} /> Filed Incidents
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {riskResult.reports.map((report) => (
                        <div
                          key={report.id}
                          style={{
                            padding: "10px 12px",
                            background: "#fff",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.76rem",
                              color: "var(--muted)",
                              marginBottom: "4px",
                            }}
                          >
                            <span>
                              <strong>Reported by:</strong> {report.reportedBy}
                            </span>
                            <span>{report.date}</span>
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "#1e293b",
                              marginBottom: report.details ? "4px" : "0",
                            }}
                          >
                            {report.reason}
                          </div>
                          {report.details && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.8rem",
                                color: "var(--muted)",
                                lineHeight: 1.4,
                              }}
                            >
                              {report.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Advisory Risk Indicator Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "var(--paper-subtle, #f8fafc)",
                  border: "1px solid var(--line)",
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  lineHeight: 1.5,
                  marginBottom: "18px",
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ color: "var(--ink)", display: "block" }}>
                    Advisory Risk Indicator
                  </strong>
                  The PayPruf Risk Intelligence tool is an advisory crowd-sourced
                  register. Regardless of report status, always require full bank
                  ledger reconciliation before dispatching orders.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleReset}
                  className="button button-primary"
                  style={{ flex: 1 }}
                >
                  <RotateCcw size={16} /> Check Another Account
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="button button-secondary"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountRiskModal;
