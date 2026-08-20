import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Banknote, CalendarDays, FileSearch, Image, RefreshCw, Share2, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage, resolveApiAssetUrl } from "../services/api";
import { formatDateTime, formatFileSize, formatMoney } from "../utils/format";

function DetailItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return <div className="detail-item"><dt>{label}</dt><dd className={mono ? "reference-text" : undefined}>{value || "Not available"}</dd></div>;
}

export function PaymentDetailsPage() {
  const { paymentId = "" } = useParams();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const detailQuery = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: ({ signal }) => api.getPayment(paymentId, signal),
    enabled: Boolean(paymentId),
  });
  const recheck = useMutation({
    mutationFn: () => api.recheckPayment(paymentId),
    onSuccess: () => {
      pushToast("Payment verification updated");
      void queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => pushToast(getErrorMessage(error), "error"),
  });

  if (detailQuery.isPending) return <PageLoader label="Loading payment record" />;
  if (detailQuery.isError) return <StatePanel title="Payment record unavailable" message={getErrorMessage(detailQuery.error)} action={<><RetryButton onClick={() => void detailQuery.refetch()} /><Link className="button button-ghost" to="/dashboard">Return to dashboard</Link></>} />;

  const { payment, merchant, receipt, transaction, verification } = detailQuery.data;
  const timeline = detailQuery.data.timeline?.length ? detailQuery.data.timeline : verification?.timeline ?? [];
  const previewUrl = resolveApiAssetUrl(receipt?.preview_url);
  const canRecheck = Boolean(receipt && (payment.status === "PENDING" || payment.status === "NOT_RECEIVED"));

  return (
    <div className="details-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={16} /> Back to dashboard</Link>
      <section className="details-heading">
        <div>
          <span className="eyebrow">Payment record</span>
          <div className="title-with-status"><h1>{payment.customer_name}</h1><StatusBadge status={payment.status} /></div>
          <p className="reference-text">{payment.reference}</p>
        </div>
        <div className="heading-actions">
          {canRecheck && <button className="button button-secondary" type="button" onClick={() => recheck.mutate()} disabled={recheck.isPending}><RefreshCw className={recheck.isPending ? "spin" : ""} size={17} /> {recheck.isPending ? "Checking" : "Recheck"}</button>}
          <Link className="button button-secondary" to={`/payment-link/${payment.id}`}><Share2 size={17} /> Share link</Link>
          {verification && <Link className="button button-primary" to={`/verification/${payment.id}`}>View result <ArrowRight size={17} /></Link>}
        </div>
      </section>

      {recheck.isError && <div className="inline-alert" role="alert">{getErrorMessage(recheck.error)}</div>}

      <section className="record-summary">
        <article className="record-amount">
          <span>Requested amount</span>
          <strong>{formatMoney(payment.amount, payment.currency)}</strong>
          <small>{payment.description}</small>
        </article>
        <dl className="record-meta">
          <DetailItem label="Customer" value={payment.customer_name} />
          <DetailItem label="Customer phone" value={payment.customer_phone} />
          <DetailItem label="Created" value={formatDateTime(payment.created_at)} />
          <DetailItem label="Expires" value={formatDateTime(payment.expires_at)} />
          <DetailItem label="Order note" value={payment.order_note} />
          <DetailItem label="Merchant" value={merchant.business_name} />
        </dl>
        <div className="status-reason"><ShieldCheck size={18} aria-hidden="true" /><div><strong>Current status</strong><p>{payment.status_reason}</p></div></div>
      </section>

      <div className="record-grid">
        <section className="content-card receipt-detail-card">
          <div className="section-heading compact"><div><span className="eyebrow">Customer evidence</span><h2>Receipt intelligence</h2></div><FileSearch size={21} aria-hidden="true" /></div>
          {!receipt ? (
            <StatePanel tone="empty" title="No receipt uploaded" message="The customer has not added payment evidence yet." />
          ) : (
            <>
              <div className="receipt-file-row">
                <span><Image size={20} aria-hidden="true" /></span>
                <div><strong>{receipt.original_filename}</strong><small>{formatFileSize(receipt.size_bytes)} · {receipt.mime_type}</small></div>
                {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer">Open receipt</a>}
              </div>
              {previewUrl && receipt.mime_type.startsWith("image/") && <a className="receipt-image-preview" href={previewUrl} target="_blank" rel="noreferrer"><img src={previewUrl} alt="Uploaded payment receipt" /></a>}
              <dl className="extraction-grid">
                <DetailItem label="Amount read" value={receipt.amount ? formatMoney(receipt.amount, receipt.currency || payment.currency) : null} />
                <DetailItem label="Receipt reference" value={receipt.reference} mono />
                <DetailItem label="Bank / provider" value={receipt.bank} />
                <DetailItem label="Status text" value={receipt.status_text} />
                <DetailItem label="Sender" value={receipt.sender_name} />
                <DetailItem label="Recipient" value={receipt.recipient_name} />
                <DetailItem label="Transaction date" value={receipt.transaction_date} />
                <DetailItem label="Account detail" value={receipt.account_hint} />
              </dl>
              <div className="confidence-meter"><div><span>Extraction confidence</span><strong>{Math.round(receipt.confidence * 100)}%</strong></div><span><i style={{ width: `${Math.max(0, Math.min(100, receipt.confidence * 100))}%` }} /></span></div>
              {receipt.raw_text && <details className="raw-text"><summary>View normalized receipt text</summary><pre>{receipt.raw_text}</pre></details>}
            </>
          )}
        </section>

        <section className="content-card transaction-card">
          <div className="section-heading compact"><div><span className="eyebrow">Source of payment truth</span><h2>Merchant transaction</h2></div><Banknote size={21} aria-hidden="true" /></div>
          {!transaction ? (
            <StatePanel tone="empty" title="No transaction found" message="PayPruf could not locate a corresponding merchant-side transaction for this payment." />
          ) : (
            <>
              <div className="transaction-amount"><span>Amount received</span><strong>{formatMoney(transaction.amount, transaction.currency)}</strong><span className={`provider-status provider-${transaction.status.toLowerCase()}`}>{transaction.status}</span></div>
              <dl className="extraction-grid">
                <DetailItem label="Provider" value={transaction.provider.replace("_", " ")} />
                <DetailItem label="Bank reference" value={transaction.provider_reference} mono />
                <DetailItem label="Payment link" value={transaction.payment_reference} mono />
                <DetailItem label="Sender" value={transaction.sender_name} />
                <DetailItem label="Transaction date" value={formatDateTime(transaction.transaction_date)} />
                <DetailItem label="Recipient account" value={transaction.recipient_account_hint} />
              </dl>
              <div className="sandbox-note"><ShieldCheck size={17} /><span><strong>Wema sandbox / demo environment</strong> This record is deterministic demonstration data, not a claimed live bank connection.</span></div>
            </>
          )}
        </section>
      </div>

      {verification && (
        <section className="content-card detail-comparison-card">
          <div className="section-heading compact"><div><span className="eyebrow">Reconciliation result</span><h2>Comparison at a glance</h2></div><StatusBadge status={verification.status} /></div>
          <div className="amount-comparison">
            <div><span>Expected</span><strong>{formatMoney(verification.comparison.expected_amount)}</strong></div>
            <div><span>Receipt</span><strong>{formatMoney(verification.comparison.receipt_amount)}</strong></div>
            <div className={verification.status === "MISMATCH" ? "comparison-alert" : ""}><span>Received</span><strong>{verification.comparison.received_amount ? formatMoney(verification.comparison.received_amount) : "Not found"}</strong></div>
          </div>
          <p className="verification-reason">{verification.reason}</p>
        </section>
      )}

      <section className="content-card timeline-card">
        <div className="section-heading compact"><div><span className="eyebrow">Audit trail</span><h2>Verification timeline</h2></div><CalendarDays size={21} aria-hidden="true" /></div>
        {timeline.length ? <Timeline items={timeline} /> : <StatePanel tone="empty" title="Awaiting customer activity" message="Timeline events will appear when the customer opens the payment link and uploads a receipt." />}
      </section>
    </div>
  );
}
