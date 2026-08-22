import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { ReportMerchantModal } from "../components/ReportMerchantModal";
import { StatusBadge } from "../components/StatusBadge";
import { VerificationProgress } from "../components/VerificationProgress";
import { AIOfflineNotice } from "../components/common/AIOfflineNotice";
import { useCopy } from "../hooks/useCopy";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage } from "../services/api";
import { formatDateTime, formatMoney } from "../utils/format";

export function CustomerPaymentPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { copy, copiedValue } = useCopy();

  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["publicPayment", token],
    queryFn: () => api.getPublicPayment(token),
    enabled: Boolean(token),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      await api.uploadPublicReceipt(token, file);
      return api.verifyPublicPayment(token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["publicPayment", token] });
      pushToast("Receipt uploaded and verified.");
      navigate(`/verification/${token}`);
    },
    onError: (err) => {
      setUploadError(getErrorMessage(err));
    },
  });

  if (isLoading) {
    return <PageLoader label="Loading your payment request" />;
  }

  if (isError || !data) {
    return (
      <StatePanel
        title="Payment link unavailable"
        message={getErrorMessage(error)}
        action={<RetryButton onClick={() => refetch()} />}
      />
    );
  }

  const { payment, merchant, payment_instructions, receipt, verification } = data;
  const isConfirmed =
    (verification?.status === "CONFIRMED" || payment.status === "CONFIRMED") &&
    Boolean(receipt || payment.receipt);

  const handleVerify = () => {
    if (!receiptFile) return;
    setUploadError(null);
    uploadMutation.mutate(receiptFile);
  };

  return (
    <div className="customer-page">
      <section className="customer-intro">
        <div className="merchant-identity">
          <span aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <small>Paying to</small>
            <strong>{merchant.business_name}</strong>
          </div>
        </div>

        <span className="eyebrow">Amount to transfer</span>
        <h1>{formatMoney(payment.amount, payment.currency)}</h1>
        <p>{payment.description}</p>

        <div className="reference-line">
          <span>Payment reference:</span>
          <strong>{payment.reference}</strong>
          <button
            type="button"
            onClick={() => copy(payment.reference)}
            aria-label="Copy payment reference"
          >
            {copiedValue === payment.reference ? (
              <Check size={16} />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>

        {payment.expires_at && (
          <div className="payment-expiry">
            <span>Valid until {formatDateTime(payment.expires_at)}</span>
          </div>
        )}
      </section>

      <section className="instruction-card">
        <div className="card-heading-row">
          <div>
            <span className="eyebrow">Step 1</span>
            <h2>Make Bank Transfer</h2>
          </div>
          <span className="environment-pill sandbox-label">
            <ShieldCheck size={14} /> Wema demo sandbox
          </span>
        </div>
        <p>
          Transfer exactly{" "}
          <strong>{formatMoney(payment.amount, payment.currency)}</strong> to the
          account below using your mobile banking app or USSD.
        </p>

        <dl className="bank-details">
          <div className="account-number-row">
            <dt>Bank Name & Account Number</dt>
            <dd>
              <div>
                <span>{payment_instructions.bank_name}</span>
                <strong>{payment_instructions.account_number}</strong>
              </div>
              <button
                type="button"
                onClick={() => copy(payment_instructions.account_number)}
                aria-label="Copy account number"
              >
                {copiedValue === payment_instructions.account_number ? (
                  <Check size={18} />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </dd>
          </div>
          <div>
            <dt>Account Name</dt>
            <dd>{payment_instructions.account_name}</dd>
          </div>
          <div>
            <dt>Transfer Remark / Narration</dt>
            <dd className="reference-text">{payment.reference}</dd>
          </div>
        </dl>

        <div className="sandbox-disclaimer">
          <Info size={18} />
          <div>
            <span>
              <strong>Demo simulation note:</strong> In this interactive sandbox,
              you can upload any sample receipt image or PDF below to see PayPruf's
              OCR and bank reconciliation engine in action.
            </span>
          </div>
        </div>
      </section>

      <section className="receipt-card">
        <div className="receipt-section-heading">
          <span aria-hidden="true">
            <UploadCloud size={22} />
          </span>
          <div>
            <span className="eyebrow">Step 2</span>
            <h2>Upload Proof of Payment</h2>
            <p>
              Upload the transfer receipt from your banking app. PayPruf will
              extract the details and confirm the transfer.
            </p>
          </div>
        </div>

        <AIOfflineNotice receipt={receipt} />

        {verification && (
          <div className="current-result">
            <span>Current verification status:</span>
            <StatusBadge status={verification.status} />
            <Link to={`/verification/${token}`}>View details</Link>
          </div>
        )}

        <ReceiptUploader
          file={receiptFile}
          onFile={setReceiptFile}
          onError={setUploadError}
          disabled={uploadMutation.isPending}
          existingReceipt={receipt}
        />

        {uploadError && (
          <div className="inline-alert" role="alert" style={{ marginTop: "14px" }}>
            {uploadError}
          </div>
        )}

        <VerificationProgress active={uploadMutation.isPending} />

        <button
          className="button button-primary verify-button"
          type="button"
          onClick={handleVerify}
          disabled={!receiptFile || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            "Verifying with bank ledger..."
          ) : (
            <>
              Verify Payment <ArrowRight size={18} />
            </>
          )}
        </button>

        <p className="action-hint">
          Verification typically completes in under 5 seconds.
        </p>

        <div className="truth-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Proof Beyond The Receipt</strong>
            <span>
              PayPruf doesn't just read images—we confirm funds in the merchant's
              bank account before marking payments as confirmed.
            </span>
          </div>
        </div>

        {/* Report Merchant Feature */}
        <div
          className="merchant-report-container"
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: isConfirmed ? "var(--ink)" : "var(--muted)",
                }}
              >
                Report merchant for fraudulent activities
              </span>
              <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                {isConfirmed
                  ? "Receipt confirmed. You can lay an incident report to protect the community."
                  : "Only customers who have uploaded a confirmed payment receipt can lay a report."}
              </span>
            </div>
            <button
              type="button"
              id="btn-report-merchant"
              onClick={() => setIsReportModalOpen(true)}
              className="button button-ghost"
              style={{
                color: isConfirmed ? "var(--mismatch)" : "var(--muted)",
                borderColor: isConfirmed ? "var(--mismatch-line, #fecdd3)" : "var(--line)",
                fontSize: "0.82rem",
                padding: "6px 14px",
                height: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <AlertTriangle size={15} />
              <span>Report Merchant</span>
            </button>
          </div>
        </div>
      </section>

      {/* Report Merchant Modal */}
      <ReportMerchantModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        merchantAccount={payment_instructions.account_number}
        merchantName={merchant.business_name || payment_instructions.account_name}
        paymentReference={payment.reference}
        customerName={payment.customer_name}
        isConfirmed={isConfirmed}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["publicPayment", token] });
        }}
      />
    </div>
  );
}

export default CustomerPaymentPage;
