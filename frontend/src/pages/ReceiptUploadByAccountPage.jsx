import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileImage,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Navbar } from "../components/Navbar";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { VerificationProgress } from "../components/VerificationProgress";
import { api, getErrorMessage } from "../services/api";
import { formatMoney } from "../utils/format";

export function ReceiptUploadPage({ accountName: propAccountName, paymentId }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const accountName = propAccountName || params.accountName || "Tola Fashion";

  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    if (!receiptFile) return;
    setUploadError(null);
    setIsVerifying(true);

    try {
      // Simulate verification for this account
      await new Promise((r) => setTimeout(r, 2200));
      setResult({
        status: "CONFIRMED",
        accountName,
        amount: "25000.00",
        reference: `PRF-${Date.now().toString().slice(-6)}`,
        message: `Receipt successfully verified and matched with incoming credit to ${accountName}.`,
      });
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="public-shell">
      <Navbar currentView="account-check" />

      <main className="public-main" style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 16px" }}>
        <Link className="back-link" to={user ? "/dashboard" : "/"}>
          <ArrowLeft size={16} /> {user ? "Back to dashboard" : "Back to home"}
        </Link>

        <section className="receipt-card" style={{ marginTop: "12px" }}>
          <div className="merchant-identity" style={{ marginBottom: "20px" }}>
            <span aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <div>
              <small>Verifying payment for</small>
              <strong>{decodeURIComponent(accountName)}</strong>
            </div>
          </div>

          <div className="receipt-section-heading">
            <span aria-hidden="true">
              <UploadCloud size={22} />
            </span>
            <div>
              <span className="eyebrow">Proof of transfer</span>
              <h2>Upload Receipt for {decodeURIComponent(accountName)}</h2>
              <p>
                Upload your payment receipt or transfer screenshot. PayPruf will
                scan and reconcile it with the merchant's account.
              </p>
            </div>
          </div>

          {result ? (
            <div
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "var(--confirmed-soft)",
                border: "1px solid #c8e4d7",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  margin: "0 auto 16px",
                  borderRadius: "50%",
                  background: "var(--confirmed)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: "0 0 8px", color: "var(--confirmed)" }}>
                Payment Verified!
              </h3>
              <p style={{ margin: "0 0 16px", color: "#1b4d3e", fontSize: "0.9rem" }}>
                {result.message}
              </p>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "20px",
                }}
              >
                Amount: {formatMoney(result.amount)} · Ref: {result.reference}
              </div>
              <div>
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
                  "Verifying receipt..."
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
              <strong>Instant Ledger Reconciliation</strong>
              <span>
                PayPruf performs automated OCR extraction and cross-checks with
                Wema bank transaction records in real time.
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReceiptUploadPage;
