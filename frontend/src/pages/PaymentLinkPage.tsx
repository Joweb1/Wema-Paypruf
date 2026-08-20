import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Check, Copy, ExternalLink, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { StatusBadge } from "../components/StatusBadge";
import { useCopy } from "../hooks/useCopy";
import { api, getErrorMessage } from "../services/api";
import { formatDateTime, formatMoney, safePublicPath } from "../utils/format";

export function PaymentLinkPage() {
  const { paymentId = "" } = useParams();
  const { copy, copiedValue } = useCopy();
  const paymentQuery = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: ({ signal }) => api.getPayment(paymentId, signal),
    enabled: Boolean(paymentId),
  });

  if (paymentQuery.isPending) return <PageLoader label="Generating your share page" />;
  if (paymentQuery.isError) return <StatePanel title="Payment link unavailable" message={getErrorMessage(paymentQuery.error)} action={<><RetryButton onClick={() => void paymentQuery.refetch()} /><Link className="button button-ghost" to="/dashboard">Return to dashboard</Link></>} />;

  const payment = paymentQuery.data.payment;
  const publicPath = safePublicPath(payment.public_url, payment.public_token);
  const publicUrl = payment.public_url || `${window.location.origin}${publicPath}`;
  const message = `Payment request from ${paymentQuery.data.merchant.business_name}\n\nAmount: ${formatMoney(payment.amount, payment.currency)}\nReference: ${payment.reference}\n\nComplete your payment: ${publicUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="narrow-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={16} /> Back to dashboard</Link>
      <section className="share-card">
        <div className="share-success-mark"><Check size={27} aria-hidden="true" /></div>
        <span className="eyebrow">Payment link ready</span>
        <h1>Share this request with {payment.customer_name}.</h1>
        <p>They’ll see the payment instructions, upload a receipt, and receive a result only after PayPruf checks the merchant-side record.</p>

        <div className="payment-ticket">
          <div className="ticket-top"><span>Payment request</span><StatusBadge status={payment.status} /></div>
          <strong>{formatMoney(payment.amount, payment.currency)}</strong>
          <dl>
            <div><dt><UserRound size={15} /> Customer</dt><dd>{payment.customer_name}</dd></div>
            <div><dt>Reference</dt><dd className="reference-text">{payment.reference}</dd></div>
            <div><dt>Description</dt><dd>{payment.description}</dd></div>
            <div><dt><CalendarClock size={15} /> Expires</dt><dd>{formatDateTime(payment.expires_at)}</dd></div>
          </dl>
        </div>

        {(paymentQuery.data.merchant.wema_account_name || paymentQuery.data.merchant.wema_account_number) && (
          <dl className="share-account-summary">
            <div><dt>Demo bank</dt><dd>{paymentQuery.data.merchant.bank_name || "Wema Bank"}</dd></div>
            <div><dt>Account name</dt><dd>{paymentQuery.data.merchant.wema_account_name}</dd></div>
            <div><dt>Sandbox account</dt><dd>{paymentQuery.data.merchant.wema_account_number || paymentQuery.data.merchant.wema_account_number_hint || "Shown on customer page"}</dd></div>
          </dl>
        )}

        <div className="share-link-box">
          <label htmlFor="public-payment-url">Public PayPruf link</label>
          <div><input id="public-payment-url" value={publicUrl} readOnly /><button type="button" onClick={() => void copy(publicUrl, "Payment link copied")}><span className="sr-only">Copy payment link</span>{copiedValue === publicUrl ? <Check size={18} /> : <Copy size={18} />}</button></div>
        </div>

        {payment.is_expired && <div className="inline-alert">This payment request has expired. Create a new request before sharing it.</div>}
        <div className="share-actions">
          <a className="button button-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Share on WhatsApp</a>
          <Link className="button button-secondary" to={publicPath}><ExternalLink size={17} /> Open customer page</Link>
        </div>
        <div className="sandbox-note"><ShieldCheck size={17} aria-hidden="true" /><span><strong>Safe demo mode</strong> Payment checks use the clearly labelled Wema sandbox / demo environment.</span></div>
        <Link className="done-link" to="/dashboard">Done — return to dashboard</Link>
      </section>
    </div>
  );
}
