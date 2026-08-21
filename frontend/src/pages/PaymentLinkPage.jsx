import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  QrCode,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { useCopy } from "../hooks/useCopy";
import { api, getErrorMessage } from "../services/api";
import { formatDateTime, formatMoney, safePublicPath } from "../utils/format";

export function PaymentLinkPage() {
  const { paymentId = "" } = useParams();
  const { user } = useAuth();
  const { copy, copiedValue } = useCopy();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => api.getPayment(paymentId),
    enabled: Boolean(paymentId),
  });

  if (isLoading) {
    return <PageLoader label="Generating payment link view" />;
  }

  if (isError || !data) {
    return (
      <StatePanel
        title="Payment link not found"
        message={getErrorMessage(error)}
        action={<RetryButton onClick={() => refetch()} />}
      />
    );
  }

  const { payment, merchant } = data;
  const publicRelativePath = safePublicPath(payment.public_url, payment.public_token);
  const fullShareUrl = typeof window !== "undefined"
    ? `${window.location.origin}${publicRelativePath}`
    : publicRelativePath;

  const whatsappText = encodeURIComponent(
    `Hello ${payment.customer_name}, please complete your payment of ${formatMoney(
      payment.amount,
      payment.currency
    )} for "${payment.description}".\n\nPay securely & upload your transfer receipt here:\n${fullShareUrl}`
  );

  return (
    <div className="narrow-page">
      <Link className="back-link" to={user ? "/dashboard" : "/"}>
        <ArrowLeft size={16} /> {user ? "Back to dashboard" : "Back to home"}
      </Link>

      <section className="share-card">
        <span className="share-success-mark" aria-hidden="true">
          <ShieldCheck size={30} />
        </span>
        <span className="eyebrow">Payment link ready</span>
        <h1>Share with {payment.customer_name}</h1>
        <p>
          Send this secure link to your customer to guide their bank transfer
          and collect proof of payment.
        </p>

        <div className="payment-ticket">
          <div className="ticket-top">
            <span>PayPruf Transfer Request</span>
            <span>{payment.reference}</span>
          </div>
          <strong>{formatMoney(payment.amount, payment.currency)}</strong>
          <dl>
            <div>
              <dt>Customer</dt>
              <dd>{payment.customer_name}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{payment.description}</dd>
            </div>
            <div>
              <dt>Settlement account</dt>
              <dd>{merchant.wema_account_name}</dd>
            </div>
            <div>
              <dt>Link validity</dt>
              <dd>Valid until {formatDateTime(payment.expires_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="share-link-box">
          <label htmlFor="share-input">Direct payment URL</label>
          <div>
            <input
              id="share-input"
              readOnly
              value={fullShareUrl}
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => copy(fullShareUrl)}
              aria-label="Copy payment URL"
            >
              {copiedValue === fullShareUrl ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        <div className="share-actions">
          <a
            className="button button-primary"
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Share via WhatsApp
          </a>
          <Link className="button button-secondary" to={publicRelativePath}>
            <ExternalLink size={18} /> Open customer view
          </Link>
        </div>

        <div className="sandbox-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Wema Demo Sandbox active</strong>
            <span>
              Customer can simulate uploading a transfer receipt and view
              immediate bank-level matching results.
            </span>
          </div>
        </div>

        <Link className="done-link" to={user ? "/dashboard" : "/"}>
          {user ? "Return to dashboard" : "Return to home"}
        </Link>
      </section>
    </div>
  );
}

export default PaymentLinkPage;
