import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  ExternalLink,
  FileCheck2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage, resolveApiAssetUrl } from "../services/api";
import { formatDateTime, formatFileSize, formatMoney, safePublicPath } from "../utils/format";

export function PaymentDetailsPage() {
  const { paymentId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => api.getPayment(paymentId),
    enabled: Boolean(paymentId),
  });

  const recheckMutation = useMutation({
    mutationFn: () => api.recheckPayment(paymentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushToast("Verification status updated.");
    },
  });

  if (isLoading) {
    return <PageLoader label="Loading transaction details" />;
  }

  if (isError || !data) {
    return (
      <StatePanel
        title="Could not load payment"
        message={getErrorMessage(error)}
        action={<RetryButton onClick={() => refetch()} />}
      />
    );
  }

  const { payment, merchant, receipt, transaction, verification, timeline } = data;
  const publicPath = safePublicPath(payment.public_url, payment.public_token);

  return (
    <div className="payment-details-page">
      <Link className="back-link" to={user ? "/dashboard" : "/"}>
        <ArrowLeft size={16} /> {user ? "Back to dashboard" : "Back to home"}
      </Link>

      <div className="section-heading compact details-heading">
        <div>
          <span className="eyebrow">{payment.reference}</span>
          <div className="title-with-status">
            <h1>{payment.customer_name}</h1>
            <StatusBadge status={payment.status} />
          </div>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" to={publicPath}>
            <ExternalLink size={16} /> Customer payment page
          </Link>
          <button
            className="button button-primary"
            type="button"
            onClick={() => recheckMutation.mutate()}
            disabled={recheckMutation.isPending}
          >
            <RefreshCw
              className={recheckMutation.isPending ? "spin" : ""}
              size={16}
            />
            {recheckMutation.isPending ? "Rechecking..." : "Recheck ledger"}
          </button>
        </div>
      </div>

      <div className="record-summary">
        <div className="record-amount">
          <span>Expected amount</span>
          <strong>{formatMoney(payment.amount, payment.currency)}</strong>
          <small>{payment.description}</small>
        </div>
        <dl className="record-meta">
          <div className="detail-item">
            <dt>Customer phone</dt>
            <dd>{payment.customer_phone || "Not provided"}</dd>
          </div>
          <div className="detail-item">
            <dt>Settlement account</dt>
            <dd>
              {merchant.wema_account_name} ({merchant.wema_account_number})
            </dd>
          </div>
          <div className="detail-item">
            <dt>Created on</dt>
            <dd>{formatDateTime(payment.created_at)}</dd>
          </div>
          <div className="detail-item">
            <dt>Link validity</dt>
            <dd>{formatDateTime(payment.expires_at)}</dd>
          </div>
          {payment.status_reason && (
            <div className="status-reason">
              <ShieldCheck size={18} />
              <div>
                <strong>Reconciliation analysis</strong>
                <p>{payment.status_reason}</p>
              </div>
            </div>
          )}
        </dl>
      </div>

      <div className="record-grid">
        <section className="content-card">
          <span className="eyebrow">Customer uploaded receipt</span>
          <h2>OCR Extraction Record</h2>

          {receipt ? (
            <div>
              <div className="receipt-file-row">
                <span aria-hidden="true">
                  <FileCheck2 size={20} />
                </span>
                <div>
                  <strong>{receipt.original_filename}</strong>
                  <small>{formatFileSize(receipt.size_bytes)}</small>
                </div>
                {receipt.preview_url && (
                  <a
                    href={resolveApiAssetUrl(receipt.preview_url) || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View file
                  </a>
                )}
              </div>

              {receipt.preview_url && (
                <div className="receipt-image-preview">
                  <img
                    src={resolveApiAssetUrl(receipt.preview_url) || ""}
                    alt="Receipt preview"
                  />
                </div>
              )}

              <dl className="extraction-grid">
                <div className="detail-item">
                  <dt>Extracted amount</dt>
                  <dd>{formatMoney(receipt.amount, receipt.currency)}</dd>
                </div>
                <div className="detail-item">
                  <dt>Receipt reference</dt>
                  <dd className="reference-text">
                    {receipt.reference || "Not detected"}
                  </dd>
                </div>
                <div className="detail-item">
                  <dt>Issuing institution</dt>
                  <dd>{receipt.bank || "Not detected"}</dd>
                </div>
                <div className="detail-item">
                  <dt>Sender name</dt>
                  <dd>{receipt.sender_name || "Not detected"}</dd>
                </div>
                <div className="detail-item">
                  <dt>Beneficiary</dt>
                  <dd>{receipt.recipient_name || "Not detected"}</dd>
                </div>
                <div className="detail-item">
                  <dt>Receipt timestamp</dt>
                  <dd>{formatDateTime(receipt.transaction_date)}</dd>
                </div>
              </dl>

              {receipt.confidence != null && (
                <div className="confidence-meter">
                  <div>
                    <span>OCR confidence score</span>
                    <strong>{Math.round(receipt.confidence * 100)}%</strong>
                  </div>
                  <span>
                    <i style={{ width: `${receipt.confidence * 100}%` }} />
                  </span>
                </div>
              )}

              {receipt.raw_text && (
                <details className="raw-text">
                  <summary>View raw extracted text</summary>
                  <pre>{receipt.raw_text}</pre>
                </details>
              )}
            </div>
          ) : (
            <StatePanel
              tone="empty"
              title="No receipt uploaded"
              message="The customer has not yet uploaded a transfer receipt for this payment."
            />
          )}
        </section>

        <section className="content-card">
          <span className="eyebrow">Wema sandbox ledger</span>
          <h2>Bank Transaction Record</h2>

          {transaction ? (
            <div>
              <div className="transaction-amount">
                <span>Settled credit</span>
                <strong>{formatMoney(transaction.amount, transaction.currency)}</strong>
                <span className={`provider-status provider-${transaction.status.toLowerCase()}`}>
                  {transaction.status}
                </span>
              </div>

              <dl className="extraction-grid">
                <div className="detail-item">
                  <dt>Provider</dt>
                  <dd>{transaction.provider}</dd>
                </div>
                <div className="detail-item">
                  <dt>Provider reference</dt>
                  <dd className="reference-text">
                    {transaction.provider_reference}
                  </dd>
                </div>
                <div className="detail-item">
                  <dt>Sender name</dt>
                  <dd>{transaction.sender_name || "Unknown"}</dd>
                </div>
                <div className="detail-item">
                  <dt>Destination account</dt>
                  <dd>···{transaction.recipient_account_hint || "0123456789"}</dd>
                </div>
                <div className="detail-item">
                  <dt>Settlement time</dt>
                  <dd>{formatDateTime(transaction.transaction_date)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <StatePanel
              tone="empty"
              title="No bank transaction found"
              message="No matching credit record has been identified in the merchant's Wema account ledger."
            />
          )}
        </section>
      </div>

      {verification && (
        <section className="content-card detail-comparison-card">
          <span className="eyebrow">Automated cross-check</span>
          <h2>Reconciliation Comparison</h2>

          <div className="amount-comparison">
            <div>
              <span>Requested</span>
              <strong>{formatMoney(verification.comparison.expected_amount)}</strong>
            </div>
            <div>
              <span>Receipt</span>
              <strong>
                {verification.comparison.receipt_amount
                  ? formatMoney(verification.comparison.receipt_amount)
                  : "N/A"}
              </strong>
            </div>
            <div className={!verification.amount_match ? "comparison-alert" : ""}>
              <span>Bank Ledger</span>
              <strong>
                {verification.comparison.received_amount
                  ? formatMoney(verification.comparison.received_amount)
                  : "Not recorded"}
              </strong>
            </div>
          </div>

          <div className="verification-reason">
            <strong>Verification finding:</strong> {verification.reason}
          </div>
        </section>
      )}

      {timeline?.length > 0 && (
        <section className="content-card timeline-card">
          <span className="eyebrow">Audit log</span>
          <h2>Payment History</h2>
          <Timeline items={timeline} />
        </section>
      )}
    </div>
  );
}

export default PaymentDetailsPage;
