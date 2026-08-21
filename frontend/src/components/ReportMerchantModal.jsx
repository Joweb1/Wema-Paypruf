import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Building2,
  FileText,
} from "lucide-react";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../hooks/useToast";

const REPORT_REASONS = [
  "Issued fake payment receipt or disputed authentic transfer",
  "Refused goods/service delivery after verified payment settlement",
  "Demanded unauthorized extra fee or price extortion after transfer",
  "Attempted fraudulent reverse transfer / recall on settled funds",
  "Provided deceptive or mismatched banking beneficiary details",
  "Other fraudulent / suspicious commercial conduct",
];

export function ReportMerchantModal({
  isOpen,
  onClose,
  merchantAccount = "",
  merchantName = "",
  paymentReference = "",
  customerName = "",
  isConfirmed = false,
  onSuccess,
}) {
  const { pushToast } = useToast();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [confirmedTruth, setConfirmedTruth] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConfirmed) {
      setError("Only customers with a verified & confirmed payment receipt can submit a fraud report.");
      return;
    }
    if (!confirmedTruth) {
      setError("Please confirm that the incident details provided are accurate.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.reportMerchantAccount({
        accountNumber: merchantAccount,
        merchantName: merchantName || "Merchant Account",
        reason,
        details,
        paymentRef: paymentReference,
        reporterName: customerName || "Verified Customer",
      });

      setSubmitted(true);
      pushToast("Fraud report submitted to Community Risk Intelligence register.");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setDetails("");
    setConfirmedTruth(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="modal-card"
        ref={modalRef}
        style={{ maxWidth: "520px" }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow" style={{ color: "var(--mismatch)" }}>
              Community Fraud Protection
            </span>
            <h2 id="report-modal-title">
              {submitted ? "Incident Registered" : "Report Merchant Account"}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={handleResetAndClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {!isConfirmed ? (
            /* Access Restriction Notice */
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "var(--paper-subtle, #f1f5f9)",
                  color: "var(--muted)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                }}
              >
                <Lock size={26} />
              </div>
              <h3 style={{ margin: "0 0 8px" }}>Verified Receipt Required</h3>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  margin: "0 0 20px",
                }}
              >
                To prevent unverified or malicious claims, only customers who have
                uploaded a valid payment receipt that has been confirmed against the
                bank ledger can lay a fraud report.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={onClose}
                style={{ width: "100%" }}
              >
                Understood
              </button>
            </div>
          ) : submitted ? (
            /* Success Feedback */
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "var(--confirmed-soft)",
                  color: "var(--confirmed)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: "0 0 8px", color: "var(--ink)" }}>
                Report Successfully Filed
              </h3>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                  margin: "0 0 20px",
                }}
              >
                Thank you for safeguarding the community. Your report has been
                logged to the PayPruf Risk Intelligence register for account{" "}
                <strong>{merchantAccount}</strong> ({merchantName}).
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={handleResetAndClose}
                style={{ width: "100%" }}
              >
                Close Window
              </button>
            </div>
          ) : (
            /* Report Form */
            <form onSubmit={handleSubmit}>
              {/* Verified Reporter Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--confirmed-soft)",
                  border: "1px solid var(--confirmed-line, #bbf7d0)",
                  marginBottom: "18px",
                }}
              >
                <ShieldCheck size={18} color="var(--confirmed)" />
                <div style={{ fontSize: "0.82rem", color: "#065f46" }}>
                  <strong>Verified Transaction:</strong> Confirmed receipt for Ref{" "}
                  <code>{paymentReference}</code>. You are eligible to submit a report.
                </div>
              </div>

              {/* Merchant Details Box */}
              <div
                style={{
                  background: "var(--paper-subtle, #f8fafc)",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      display: "block",
                    }}
                  >
                    Merchant to Report
                  </span>
                  <strong style={{ fontSize: "0.95rem" }}>
                    {merchantName || "Merchant Account"}
                  </strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block" }}>
                    Wema Account
                  </span>
                  <code style={{ fontSize: "0.88rem", fontWeight: 700 }}>
                    {merchantAccount}
                  </code>
                </div>
              </div>

              {/* Reason Selection */}
              <div className="field" style={{ marginBottom: "16px" }}>
                <label htmlFor="report-reason-select">
                  Nature of Fraudulent Activity <b aria-hidden="true">*</b>
                </label>
                <select
                  id="report-reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px" }}
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Incident Details */}
              <div className="field" style={{ marginBottom: "16px" }}>
                <label htmlFor="report-details-input">
                  Incident Description & Details
                </label>
                <textarea
                  id="report-details-input"
                  rows={3}
                  placeholder="Describe what occurred (e.g., timeline, communication, refusal of items or disputed funds)..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", resize: "vertical" }}
                />
              </div>

              {/* Verification Checkbox */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  marginBottom: "18px",
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  id="report-truth-confirm"
                  checked={confirmedTruth}
                  onChange={(e) => setConfirmedTruth(e.target.checked)}
                  style={{ marginTop: "3px", cursor: "pointer" }}
                />
                <label htmlFor="report-truth-confirm" style={{ cursor: "pointer" }}>
                  I solemnly declare that I have made a verified payment to this
                  merchant account and the incident details provided above are
                  truthful and accurate.
                </label>
              </div>

              {error && (
                <div className="inline-alert" role="alert" style={{ marginBottom: "14px" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="button button-ghost"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-danger"
                  style={{ flex: 1 }}
                  disabled={isSubmitting || !confirmedTruth}
                >
                  {isSubmitting ? (
                    "Filing Incident..."
                  ) : (
                    <>
                      <AlertTriangle size={16} /> Submit Fraud Report
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportMerchantModal;
