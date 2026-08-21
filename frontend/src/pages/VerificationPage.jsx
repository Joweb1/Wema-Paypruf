import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { ReportMerchantModal } from "../components/ReportMerchantModal";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage } from "../services/api";
import { formatDateTime, formatMoney, safePublicPath } from "../utils/format";

export function VerificationPage() {
  const { token = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["publicPayment", token],
    queryFn: () => api.getPublicPayment(token),
    enabled: Boolean(token),
  });

  const recheckMutation = useMutation({
    mutationFn: () => api.recheckPublicPayment(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["publicPayment", token] });
      pushToast("Verification status updated.");
    },
  });

  if (isLoading) {
    return <PageLoader label="Checking payment verification" />;
  }

  if (isError || !data) {
    return (
      <StatePanel
        title="Verification record not found"
        message={getErrorMessage(error)}
        action={<RetryButton onClick={() => refetch()} />}
      />
    );
  }

  const { payment, merchant, verification } = data;
  const status = verification?.status || payment.status;

  const getHeroClass = () => {
    switch (status) {
      case "CONFIRMED":
        return "result-confirmed";
      case "PENDING":
        return "result-pending";
      case "MISMATCH":
        return "result-mismatch";
      case "NOT_RECEIVED":
      default:
        return "result-not-received";
    }
  };

  const getHeroIcon = () => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle2 size={38} />;
      case "PENDING":
        return <Clock3 size={38} />;
      case "MISMATCH":
        return <AlertTriangle size={38} />;
      case "NOT_RECEIVED":
      default:
        return <SearchX size={38} />;
    }
  };

  const getHeroTitle = () => {
    switch (status) {
      case "CONFIRMED":
        return "Payment Confirmed";
      case "PENDING":
        return "Verification In Progress";
      case "MISMATCH":
        return "Discrepancy Detected";
      case "NOT_RECEIVED":
      default:
        return "Payment Not Recorded";
    }
  };

  const getHeroDescription = () => {
    if (verification?.reason) return verification.reason;
    switch (status) {
      case "CONFIRMED":
        return `Your transfer of ${formatMoney(
          payment.amount,
          payment.currency
        )} to ${merchant.business_name} has been verified and settled.`;
      case "PENDING":
        return "Your receipt has been received. We are waiting for the interbank transfer to reflect in the merchant ledger.";
      case "MISMATCH":
        return "The details on your receipt do not match the expected payment amount or merchant account.";
      case "NOT_RECEIVED":
      default:
        return "We could not find a matching credit in the merchant's bank account ledger.";
    }
  };

  return (
    <div className="verification-page">
      <Link
        className="back-link"
        to={safePublicPath(payment.public_url, payment.public_token)}
      >
        <ArrowLeft size={16} /> Return to payment page
      </Link>

      <section className={`result-hero ${getHeroClass()}`}>
        <div className="result-icon">{getHeroIcon()}</div>
        <span className="eyebrow">PayPruf Verification Result</span>
        <h1>{getHeroTitle()}</h1>
        <p>{getHeroDescription()}</p>
        <StatusBadge status={status} />

        <div className="result-request-context">
          <div>
            <dt>Merchant</dt>
            <dd>{merchant.business_name}</dd>
          </div>
          <div>
            <dt>Expected amount</dt>
            <dd>{formatMoney(payment.amount, payment.currency)}</dd>
          </div>
          <div>
            <dt>Payment reference</dt>
            <dd>{payment.reference}</dd>
          </div>
        </div>

        <button
          className="button button-secondary button-on-result"
          type="button"
          onClick={() => recheckMutation.mutate()}
          disabled={recheckMutation.isPending}
        >
          <RefreshCw
            className={recheckMutation.isPending ? "spin" : ""}
            size={16}
          />
          {recheckMutation.isPending ? "Rechecking..." : "Recheck status"}
        </button>
      </section>

      {verification?.comparison && (
        <section className="content-card comparison-card">
          <span className="eyebrow">Cross-check findings</span>
          <h2>Payment Ledger Comparison</h2>

          <div className="amount-comparison">
            <div>
              <span>Requested</span>
              <strong>
                {formatMoney(verification.comparison.expected_amount)}
              </strong>
            </div>
            <div>
              <span>Extracted from receipt</span>
              <strong>
                {verification.comparison.receipt_amount
                  ? formatMoney(verification.comparison.receipt_amount)
                  : "N/A"}
              </strong>
            </div>
            <div
              className={
                !verification.amount_match ? "comparison-alert" : ""
              }
            >
              <span>Settled in bank account</span>
              <strong>
                {verification.comparison.received_amount
                  ? formatMoney(verification.comparison.received_amount)
                  : "Not found"}
              </strong>
            </div>
          </div>

          <div className="result-lower-grid">
            <section className="result-checks">
              <h2>Verification Checks</h2>
              <ul>
                <li
                  className={
                    verification.amount_match ? "match-yes" : "match-no"
                  }
                >
                  <Check size={14} />
                  <span>Amount check</span>
                  <strong>
                    {verification.amount_match ? "MATCH" : "FLAGGED"}
                  </strong>
                </li>
                <li
                  className={
                    verification.reference_match ? "match-yes" : "match-no"
                  }
                >
                  <Check size={14} />
                  <span>Reference check</span>
                  <strong>
                    {verification.reference_match ? "MATCH" : "FLAGGED"}
                  </strong>
                </li>
                <li
                  className={
                    verification.currency_match ? "match-yes" : "match-no"
                  }
                >
                  <Check size={14} />
                  <span>Currency check</span>
                  <strong>
                    {verification.currency_match ? "MATCH" : "FLAGGED"}
                  </strong>
                </li>
                <li
                  className={
                    verification.merchant_match ? "match-yes" : "match-no"
                  }
                >
                  <Check size={14} />
                  <span>Beneficiary account check</span>
                  <strong>
                    {verification.merchant_match ? "MATCH" : "FLAGGED"}
                  </strong>
                </li>
              </ul>
              {verification.verified_at && (
                <div className="verified-time">
                  <ShieldCheck size={15} />
                  <span>
                    Verified at {formatDateTime(verification.verified_at)}
                  </span>
                </div>
              )}
            </section>

            {verification.timeline?.length > 0 && (
              <section>
                <h2>Audit Log</h2>
                <Timeline items={verification.timeline} />
              </section>
            )}
          </div>
        </section>
      )}

      <div className="result-actions">
        <Link
          className="button button-secondary"
          to={safePublicPath(payment.public_url, payment.public_token)}
        >
          Upload a different receipt
        </Link>
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="button button-ghost"
          style={{ color: "var(--mismatch)", borderColor: "var(--mismatch-line, #fecdd3)" }}
        >
          <AlertTriangle size={16} /> Report Merchant
        </button>
        <Link className="button button-primary" to={user ? "/dashboard" : "/"}>
          {user ? "Go to Dashboard" : "Go to PayPruf homepage"}
        </Link>
      </div>

      <p className="result-footnote" style={{ marginTop: "24px" }}>
        PayPruf combines OCR receipt intelligence with real-time bank ledger
        reconciliation to safeguard transactions.
      </p>

      {/* Report Merchant Modal */}
      <ReportMerchantModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        merchantAccount={
          data.payment_instructions?.account_number ||
          verification?.transaction?.recipient_account_hint ||
          "0123456789"
        }
        merchantName={merchant?.business_name || "Merchant Account"}
        paymentReference={payment.reference}
        customerName={payment.customer_name}
        isConfirmed={status === "CONFIRMED"}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["publicPayment", token] });
        }}
      />
    </div>
  );
}

export default VerificationPage;
