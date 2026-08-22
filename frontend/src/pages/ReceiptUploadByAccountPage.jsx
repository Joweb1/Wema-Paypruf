import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Navbar } from "../components/Navbar";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { VerificationProgress } from "../components/VerificationProgress";
import { AIOfflineNotice, AIEngineBadge } from "../components/common/AIOfflineNotice";
import { api, getErrorMessage } from "../services/api";
import { formatMoney } from "../utils/format";

export function ReceiptUploadPage({ accountName: propAccountName }) {
  const params = useParams();
  const { user } = useAuth();
  const rawAccountName = propAccountName || params.accountName || "Tola Fashion";
  const decodedAccountName = decodeURIComponent(rawAccountName);

  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    if (!receiptFile) return;
    setUploadError(null);
    setIsVerifying(true);

    try {
      const data = await api.uploadDirectReceipt(decodedAccountName, receiptFile);
      setResult(data);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const isConfirmed = result?.status === "CONFIRMED";
  const isMismatch = result?.status === "MISMATCH";

  return (
    <div className="public-shell">
      <Navbar currentView="account-check" />

      <main className="public-main" style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 16px" }}>
        <Link className="back-link" to={user ? "/dashboard" : "/"}>
          <ArrowLeft size={16} /> {user ? "Back to dashboard" : "Back to home"}
        </Link>

        <section className="receipt-card" style={{ marginTop: "12px" }}>
          <div className="merchant-identity" style={{ marginBottom: "20px" }}>
            <span aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <div>
              <small>Verifying payment for merchant</small>
              <strong>{decodedAccountName}</strong>
            </div>
          </div>

          <div className="receipt-section-heading">
            <span aria-hidden="true">
              <UploadCloud size={22} />
            </span>
            <div>
              <span className="eyebrow">Proof of transfer</span>
              <h2>Upload Receipt for {decodedAccountName}</h2>
              <p>
                Upload your payment receipt or transfer slip. PayPruf will perform AI forensic analysis,
                verify the beneficiary account name, and cross-check receipt authenticity.
              </p>
            </div>
          </div>

          {result ? (
            <div style={{ marginTop: "24px" }}>
              <AIOfflineNotice receipt={result} />

              {/* Status Hero Card */}
              <div
                style={{
                  padding: "24px",
                  borderRadius: "20px",
                  background: isConfirmed
                    ? "var(--confirmed-soft)"
                    : isMismatch
                    ? "var(--mismatch-soft)"
                    : "#fff1f0",
                  border: `1px solid ${
                    isConfirmed
                      ? "#c8e4d7"
                      : isMismatch
                      ? "#f1d4a7"
                      : "#ffccc7"
                  }`,
                  textAlign: "center",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    background: isConfirmed
                      ? "var(--confirmed)"
                      : isMismatch
                      ? "var(--mismatch)"
                      : "var(--not-received)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {isConfirmed ? (
                    <CheckCircle2 size={32} />
                  ) : isMismatch ? (
                    <AlertTriangle size={32} />
                  ) : (
                    <XCircle size={32} />
                  )}
                </div>

                <h3
                  style={{
                    margin: "0 0 8px",
                    color: isConfirmed
                      ? "var(--confirmed)"
                      : isMismatch
                      ? "var(--mismatch)"
                      : "var(--not-received)",
                    fontSize: "1.25rem",
                  }}
                >
                  {isConfirmed
                    ? "Receipt Authenticated & Verified!"
                    : isMismatch
                    ? "Discrepancy / Mismatch Detected"
                    : "Receipt Verification Failed"}
                </h3>

                <p
                  style={{
                    margin: "0 0 16px",
                    color: isConfirmed ? "#1b4d3e" : "#5c3b00",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  {result.message}
                </p>

                {result.mismatch_details && result.mismatch_details.length > 0 && (
                  <div
                    style={{
                      textAlign: "left",
                      background: "#fff",
                      border: "1px solid #f1d4a7",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                    }}
                  >
                    <strong style={{ fontSize: "0.85rem", color: "#874d00", display: "block", marginBottom: "6px" }}>
                      Identified Discrepancies:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", color: "#5c3b00" }}>
                      {result.mismatch_details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: "#fff",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <span>Amount: {formatMoney(result.amount, result.currency)}</span>
                  <span>·</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                    Ref: {result.reference}
                  </span>
                </div>
              </div>

              {/* Forensic & Reconciliation Breakdown */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span className="eyebrow" style={{ margin: 0 }}>AI Forensic Analysis Matrix</span>
                  <AIEngineBadge receipt={result} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <small style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>AI Originality Rating</small>
                    <strong style={{ fontSize: "1.1rem", color: result.originality_score >= 0.85 ? "#059669" : "#d97706" }}>
                      {result.originality_rating || `${(result.originality_score * 100).toFixed(0)}%`}
                    </strong>
                  </div>

                  <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <small style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>Authenticity Verdict</small>
                    <strong style={{ fontSize: "1.1rem", color: result.authenticity_verdict === "GENUINE" ? "#059669" : "#dc2626" }}>
                      {result.authenticity_verdict || "GENUINE"}
                    </strong>
                  </div>

                  <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <small style={{ color: "#6b7280", display: "block", marginBottom: "4px" }}>Beneficiary Matching</small>
                    <strong style={{ fontSize: "1.1rem", color: result.recipient_match ? "#059669" : "#dc2626" }}>
                      {result.recipient_match ? "Matched ✓" : "Mismatched ✗"}
                    </strong>
                  </div>
                </div>

                {/* Recipient Cross-Check Row */}
                <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Beneficiary Cross-Check</span>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "6px", background: result.recipient_match ? "#d1fae5" : "#fee2e2", color: result.recipient_match ? "#065f46" : "#991b1b", fontWeight: 600 }}>
                      {result.recipient_match ? "Account Verified" : "Name Discrepancy"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                    <div>
                      <span style={{ color: "#6b7280", display: "block", fontSize: "0.75rem" }}>Target Merchant:</span>
                      <strong>{result.expected_recipient || decodedAccountName}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280", display: "block", fontSize: "0.75rem" }}>Extracted from Receipt:</span>
                      <strong style={{ color: result.recipient_match ? "inherit" : "#dc2626" }}>
                        {result.recipient_name || "Not extracted"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setResult(null);
                    setReceiptFile(null);
                  }}
                >
                  Upload Another Receipt
                </button>
              </div>
            </div>
          ) : (
            <>
              <ReceiptUploader
                file={receiptFile}
                onFile={setReceiptFile}
                onError={setUploadError}
                disabled={isVerifying}
              />

              {uploadError && (
                <div className="inline-alert" role="alert" style={{ marginTop: "14px" }}>
                  {uploadError}
                </div>
              )}

              <VerificationProgress active={isVerifying} />

              <button
                className="button button-primary verify-button"
                type="button"
                onClick={handleVerify}
                disabled={!receiptFile || isVerifying}
              >
                {isVerifying ? (
                  "Analyzing receipt with AI..."
                ) : (
                  <>
                    Verify With Bank Ledger <ArrowRight size={18} />
                  </>
                )}
              </button>
            </>
          )}

          <div className="truth-note" style={{ marginTop: "24px" }}>
            <ShieldCheck size={18} />
            <div>
              <strong>Multi-Layer AI & Ledger Reconciliation</strong>
              <span>
                PayPruf performs OCR font forensics, matches beneficiary account identity, and verifies
                authenticity in real time without needing an upfront payment link.
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReceiptUploadPage;
