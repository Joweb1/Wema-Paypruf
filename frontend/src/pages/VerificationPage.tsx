import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock3, RefreshCw, SearchX, ShieldCheck, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage } from "../services/api";
import type { PaymentStatus, Verification } from "../types/api";
import { formatDateTime, formatMoney } from "../utils/format";
import { statusMeta } from "../utils/status";

const resultContent: Record<PaymentStatus, { heading: string; kicker: string; icon: typeof CheckCircle2 }> = {
  CONFIRMED: { heading: "Payment confirmed", kicker: "Merchant-side match found", icon: CheckCircle2 },
  PENDING: { heading: "Payment pending", kicker: "Transaction is still processing", icon: Clock3 },
  MISMATCH: { heading: "Payment mismatch", kicker: "The payment information differs", icon: AlertTriangle },
  NOT_RECEIVED: { heading: "Payment not received", kicker: "No corresponding transaction found", icon: SearchX },
};

function MatchItem({ label, value }: { label: string; value?: boolean | null }) {
  if (value == null) return null;
  return <li className={value ? "match-yes" : "match-no"}>{value ? <Check size={14} /> : <X size={14} />}<span>{label}</span><strong>{value ? "Matches" : "Does not match"}</strong></li>;
}

function ResultBody({ verification }: { verification: Verification }) {
  const comparison = verification.comparison;
  return (
    <>
      <section className="comparison-card content-card">
        <div className="section-heading compact"><div><span className="eyebrow">Amount comparison</span><h2>What PayPruf compared</h2></div></div>
        <div className="amount-comparison">
          <div><span>Payment request</span><strong>{formatMoney(comparison.expected_amount)}</strong></div>
          <div><span>Receipt</span><strong>{formatMoney(comparison.receipt_amount)}</strong></div>
          <div className={verification.status === "MISMATCH" ? "comparison-alert" : ""}><span>Merchant transaction</span><strong>{comparison.received_amount ? formatMoney(comparison.received_amount) : "Not found"}</strong></div>
        </div>
        {(comparison.receipt_reference || comparison.transaction_reference) && (
          <dl className="reference-comparison">
            <div><dt>Receipt reference</dt><dd>{comparison.receipt_reference || "Not extracted"}</dd></div>
            <div><dt>Transaction reference</dt><dd>{comparison.transaction_reference || "Not found"}</dd></div>
          </dl>
        )}
        {verification.transaction && (
          <dl className="result-transaction-facts">
            <div><dt>Merchant transaction status</dt><dd>{verification.transaction.status}</dd></div>
            <div><dt>Transaction date</dt><dd>{formatDateTime(verification.transaction.transaction_date)}</dd></div>
            <div><dt>Verification time</dt><dd>{formatDateTime(verification.verified_at)}</dd></div>
          </dl>
        )}
      </section>

      <div className="result-lower-grid">
        <section className="content-card result-checks">
          <span className="eyebrow">Verification checks</span>
          <h2>Match details</h2>
          <ul>
            <MatchItem label="Amount" value={verification.amount_match} />
            <MatchItem label="Reference" value={verification.reference_match} />
            <MatchItem label="Currency" value={verification.currency_match} />
            <MatchItem label="Merchant" value={verification.merchant_match} />
            <MatchItem label="Transaction date" value={verification.date_match} />
          </ul>
          <p className="verified-time"><ShieldCheck size={15} /> Checked {formatDateTime(verification.verified_at)}</p>
        </section>
        {verification.timeline?.length > 0 && <section className="content-card"><span className="eyebrow">Verification journey</span><h2>What happened</h2><Timeline items={verification.timeline} /></section>}
      </div>
    </>
  );
}

export function VerificationPage() {
  const { paymentId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const publicQuery = useQuery({
    queryKey: ["public-payment", token],
    queryFn: ({ signal }) => api.getPublicPayment(token, signal),
    enabled: Boolean(token),
  });
  const merchantDetailQuery = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: ({ signal }) => api.getPayment(paymentId, signal),
    enabled: Boolean(paymentId) && !token,
  });

  const recheck = useMutation({
    mutationFn: () => token ? api.recheckPublicPayment(token) : api.recheckPayment(paymentId),
    onSuccess: () => {
      pushToast("Payment check updated");
      void queryClient.invalidateQueries({ queryKey: token ? ["public-payment", token] : ["payment", paymentId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => pushToast(getErrorMessage(error), "error"),
  });

  const isPending = token ? publicQuery.isPending : merchantDetailQuery.isPending;
  const isError = token ? publicQuery.isError : merchantDetailQuery.isError;
  const queryError = token ? publicQuery.error : merchantDetailQuery.error;
  if (isPending) return <PageLoader label="Loading verification result" />;
  if (isError) return <StatePanel title="Verification result unavailable" message={getErrorMessage(queryError)} action={<RetryButton onClick={() => { if (token) void publicQuery.refetch(); else void merchantDetailQuery.refetch(); }} />} />;

  const verification = token ? publicQuery.data?.verification : merchantDetailQuery.data?.verification;
  const payment = token ? publicQuery.data?.payment : merchantDetailQuery.data?.payment;
  if (!verification) {
    return <StatePanel tone="empty" title="No verification result yet" message="Upload a receipt and ask PayPruf to check the payment before opening this result." action={<Link className="button button-primary" to={token ? `/pay/${encodeURIComponent(token)}` : `/payments/${paymentId}`}>Return to payment</Link>} />;
  }

  const meta = resultContent[verification.status];
  const Icon = meta.icon;
  const returnPath = token ? `/pay/${encodeURIComponent(token)}` : `/payments/${paymentId}`;
  const canRecheck = verification.status === "PENDING" || verification.status === "NOT_RECEIVED";

  return (
    <div className="verification-page">
      <Link className="back-link" to={returnPath}><ArrowLeft size={16} /> Return to payment</Link>
      <section className={`result-hero result-${verification.status.toLowerCase().replace("_", "-")}`}>
        <div className="result-icon"><Icon size={34} aria-hidden="true" /></div>
        <span className="eyebrow">{meta.kicker}</span>
        <h1>{meta.heading}</h1>
        <p>{verification.reason}</p>
        {payment && (
          <dl className="result-request-context">
            <div><dt>Customer</dt><dd>{payment.customer_name}</dd></div>
            <div><dt>PayPruf reference</dt><dd>{payment.reference}</dd></div>
            <div><dt>Requested amount</dt><dd>{formatMoney(payment.amount, payment.currency)}</dd></div>
          </dl>
        )}
        <StatusBadge status={verification.status} verbose />
        {canRecheck && <button className="button button-on-result" type="button" onClick={() => recheck.mutate()} disabled={recheck.isPending}><RefreshCw className={recheck.isPending ? "spin" : ""} size={17} /> {recheck.isPending ? "Checking again" : "Check again"}</button>}
      </section>

      {recheck.isError && <div className="inline-alert result-error" role="alert">{getErrorMessage(recheck.error)}</div>}
      <ResultBody verification={verification} />

      <div className="result-actions">
        <Link className="button button-secondary" to={returnPath}>{token && verification.status !== "CONFIRMED" ? "Replace receipt" : "View payment"}</Link>
        {!token && <Link className="button button-primary" to="/dashboard">Return to dashboard</Link>}
      </div>
      <p className="result-footnote">Result code: <strong>{verification.reason_code}</strong> · {statusMeta[verification.status].label}</p>
    </div>
  );
}
