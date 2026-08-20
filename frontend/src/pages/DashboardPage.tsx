import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, Plus, Search, SearchX, ShieldCheck, TriangleAlert, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreatePaymentModal } from "../components/CreatePaymentModal";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { PaymentList } from "../components/PaymentList";
import { useAuth } from "../auth/AuthContext";
import { api, getErrorMessage } from "../services/api";
import type { PaymentStatus, SummaryBucket } from "../types/api";
import { formatMoney } from "../utils/format";

const metricIcons = {
  confirmed: CheckCircle2,
  pending: Clock3,
  mismatch: TriangleAlert,
  notReceived: SearchX,
};

function MetricCard({ label, bucket, tone, icon: Icon }: { label: string; bucket: SummaryBucket; tone: string; icon: typeof CheckCircle2 }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span className="metric-icon"><Icon size={19} aria-hidden="true" /></span>
      <div><span>{label}</span><strong>{bucket.count.toLocaleString("en-NG")}</strong></div>
      <small>{formatMoney(bucket.value)}</small>
    </article>
  );
}

export function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const { user } = useAuth();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => api.getDashboard(signal),
  });

  const payments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (dashboard.data?.recent_payments ?? []).filter((payment) => {
      const statusMatches = status === "ALL" || payment.status === status;
      const textMatches = !query || `${payment.customer_name} ${payment.reference} ${payment.description}`.toLowerCase().includes(query);
      return statusMatches && textMatches;
    });
  }, [dashboard.data?.recent_payments, search, status]);

  if (dashboard.isPending) return <PageLoader label="Preparing your payment dashboard" />;
  if (dashboard.isError) {
    return <StatePanel title="Dashboard unavailable" message={getErrorMessage(dashboard.error)} action={<RetryButton onClick={() => void dashboard.refetch()} />} />;
  }

  const data = dashboard.data;
  const displayName = user?.fullName || data.merchant.display_name || data.merchant.business_name;
  return (
    <>
      <section className="dashboard-heading">
        <div>
          <span className="eyebrow">Merchant dashboard</span>
          <h1>Welcome, {displayName}.</h1>
          <p>Track each payment claim from receipt to merchant-side confirmation.</p>
          <div className="merchant-identity">
            <span><WalletCards size={18} aria-hidden="true" /></span>
            <div>
              <small>Merchant account</small>
              <strong>{data.merchant.wema_account_name || "Not connected"}</strong>
              <small>{data.merchant.wema_account_number_hint}</small>
            </div>
          </div>
        </div>
        <button className="button button-primary button-large" type="button" onClick={() => setCreateOpen(true)}><Plus size={19} /> Create payment</button>
      </section>

      <section className="overview-grid" aria-label="Payment overview">
        <article className="volume-card">
          <div className="volume-card-top"><span className="metric-icon"><WalletCards size={20} aria-hidden="true" /></span><span>Payment request value</span></div>
          <strong>{formatMoney(data.total.value)}</strong>
          <p>{data.total.count.toLocaleString("en-NG")} payment {data.total.count === 1 ? "request" : "requests"} recorded</p>
          <div className="volume-rule"><span style={{ width: `${data.total.count ? Math.max(8, (data.confirmed.count / data.total.count) * 100) : 0}%` }} /></div>
          <small>{data.total.count ? Math.round((data.confirmed.count / data.total.count) * 100) : 0}% confirmed</small>
        </article>
        <div className="metric-grid">
          <MetricCard label="Confirmed" bucket={data.confirmed} tone="confirmed" icon={metricIcons.confirmed} />
          <MetricCard label="Pending" bucket={data.pending} tone="pending" icon={metricIcons.pending} />
          <MetricCard label="Mismatch" bucket={data.mismatch} tone="mismatch" icon={metricIcons.mismatch} />
          <MetricCard label="Not received" bucket={data.not_received} tone="not-received" icon={metricIcons.notReceived} />
        </div>
      </section>

      <section className="trust-strip">
        <span><ShieldCheck size={20} aria-hidden="true" /></span>
        <div><strong>A receipt is evidence, not proof.</strong><p>PayPruf only confirms payment after checking the merchant-side transaction record.</p></div>
        {data.recent_payments[0] && <Link to={`/payments/${data.recent_payments[0].id}`}>See how verification works <ArrowRight size={16} /></Link>}
      </section>

      <section className="content-card payments-section">
        <div className="section-heading">
          <div><span className="eyebrow">Latest activity</span><h2>Recent payments</h2></div>
          {data.recent_payments.length > 0 && (
            <div className="table-tools">
              <label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Search recent payments</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments" /></label>
              <select aria-label="Filter payments by status" value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus | "ALL")}>
                <option value="ALL">All statuses</option><option value="CONFIRMED">Confirmed</option><option value="PENDING">Pending</option><option value="MISMATCH">Mismatch</option><option value="NOT_RECEIVED">Not received</option>
              </select>
            </div>
          )}
        </div>
        {data.recent_payments.length === 0 ? (
          <StatePanel tone="empty" title="Create your first payment request" message="Generate a PayPruf link, share it with a customer, and follow the verification here." action={<button className="button button-primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Create payment</button>} />
        ) : payments.length === 0 ? (
          <StatePanel tone="empty" title="No payments match" message="Try a different search or status filter." action={<button className="button button-secondary" type="button" onClick={() => { setSearch(""); setStatus("ALL"); }}>Clear filters</button>} />
        ) : <PaymentList payments={payments} />}
      </section>

      <CreatePaymentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
