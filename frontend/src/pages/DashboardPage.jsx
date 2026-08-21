import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Plus,
  Search,
  SearchX,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { CreatePaymentModal } from "../components/CreatePaymentModal";
import { PaymentList } from "../components/PaymentList";
import { useCopy } from "../hooks/useCopy";
import { api, getErrorMessage } from "../services/api";
import { formatMoney } from "../utils/format";

export function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const { copy, copiedValue } = useCopy();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  if (isLoading) {
    return <PageLoader label="Loading PayPruf merchant overview" />;
  }

  if (isError) {
    return (
      <StatePanel
        title="Could not load your dashboard"
        message={getErrorMessage(error)}
        action={<RetryButton onClick={() => refetch()} />}
      />
    );
  }

  const allPayments = data?.recent_payments || [];

  const payments = allPayments.filter((payment) => {
    const matchesFilter = filter === "ALL" || payment.status === filter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      payment.customer_name.toLowerCase().includes(term) ||
      payment.reference.toLowerCase().includes(term) ||
      payment.description.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">Merchant dashboard</span>
          <h1>
            Welcome,{" "}
            <strong>
              {(
                data?.merchant.display_name ||
                data?.merchant.business_name ||
                "Tola Adeyemi"
              )
                .replace(/\bDemo\b/gi, "")
                .trim()}
            </strong>
          </h1>
          <div className="settlement-account-row">
            <strong>{data?.merchant.wema_account_name}</strong>
            <span className="settlement-account-num">
              (···{data?.merchant.wema_account_number_hint})
            </span>
            <button
              type="button"
              className="settlement-copy-btn"
              onClick={() =>
                copy(data?.merchant.wema_account_number_hint || "0123456789")
              }
              title={
                copiedValue ===
                (data?.merchant.wema_account_number_hint || "0123456789")
                  ? "Account number copied"
                  : "Copy account number"
              }
              aria-label="Copy account number"
            >
              {copiedValue ===
              (data?.merchant.wema_account_number_hint || "0123456789") ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} />
              )}
            </button>
            {copiedValue ===
              (data?.merchant.wema_account_number_hint || "0123456789") && (
              <span className="settlement-copied-badge">Copied</span>
            )}
          </div>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={18} /> Create payment
        </button>
      </div>

      <div className="overview-grid">
        <section className="volume-card">
          <div className="volume-card-top">
            <span className="metric-icon" aria-hidden="true">
              <Wallet size={19} />
            </span>
            <span>Total Amount verified</span>
          </div>
          <strong>{formatMoney(data?.confirmed.value ?? 0)}</strong>
          <p>
            {data?.total.count ?? 0} recorded payment
            {data?.total.count === 1 ? "" : "s"}{" "}
            {data?.confirmed.count ?? 0} confirmed
          </p>
          <div className="volume-rule">
            <span
              style={{
                width: `${
                  data?.total.value
                    ? Math.min(
                        100,
                        Math.round(
                          ((data.confirmed.value ?? 0) / data.total.value) * 100
                        )
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <small>
            {data?.total.count ?? 0} active payment link
            {data?.total.count === 1 ? "" : "s"}
          </small>
        </section>

        <section className="metric-grid" aria-label="Transaction statistics">
          <article className="metric-card metric-confirmed">
            <span className="metric-icon" aria-hidden="true">
              <CheckCircle2 size={19} />
            </span>
            <div>
              <span>Confirmed</span>
              <strong>{data?.confirmed.count ?? 0}</strong>
            </div>
            <small>{formatMoney(data?.confirmed.value ?? 0)}</small>
          </article>

          <article className="metric-card metric-pending">
            <span className="metric-icon" aria-hidden="true">
              <Clock3 size={19} />
            </span>
            <div>
              <span>Pending</span>
              <strong>{data?.pending.count ?? 0}</strong>
            </div>
            <small>{formatMoney(data?.pending.value ?? 0)}</small>
          </article>

          <article className="metric-card metric-mismatch">
            <span className="metric-icon" aria-hidden="true">
              <AlertTriangle size={19} />
            </span>
            <div>
              <span>Mismatches</span>
              <strong>{data?.mismatch.count ?? 0}</strong>
            </div>
            <small>{formatMoney(data?.mismatch.value ?? 0)}</small>
          </article>

          <article className="metric-card metric-not-received">
            <span className="metric-icon" aria-hidden="true">
              <SearchX size={19} />
            </span>
            <div>
              <span>Not received</span>
              <strong>{data?.not_received.count ?? 0}</strong>
            </div>
            <small>{formatMoney(data?.not_received.value ?? 0)}</small>
          </article>
        </section>
      </div>

      <div className="trust-strip">
        <span aria-hidden="true">
          <ShieldCheck size={20} />
        </span>
        <div>
          <strong>Ground-truth bank reconciliation active</strong>
          <p>
            Receipt text extraction is supporting evidence. Only confirmed
            Wema ledger records mark payments as confirmed.
          </p>
        </div>
        {allPayments[0] && (
          <Link to={`/payments/${allPayments[0].id}`}>
            Review latest payment <ArrowRight size={15} />
          </Link>
        )}
      </div>

      <section className="content-card payments-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Latest activities</span>
            <h2>
              <strong>Recent payments</strong>
            </h2>
          </div>
          <div className="table-tools">
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search payments..."
                aria-label="Search payments by customer or reference"
              />
            </label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter payments by status"
            >
              <option value="ALL">All statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="MISMATCH">Mismatch</option>
              <option value="NOT_RECEIVED">Not received</option>
            </select>
          </div>
        </div>

        {payments.length ? (
          <PaymentList payments={payments} />
        ) : (
          <StatePanel
            tone="empty"
            title={
              allPayments.length
                ? "No matching payments"
                : "No payment requests yet"
            }
            message={
              allPayments.length
                ? "Try a different search keyword or status filter."
                : "Create your first PayPruf link to start collecting and verifying payments."
            }
            action={
              allPayments.length ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setFilter("ALL");
                    setSearch("");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus size={18} /> New payment request
                </button>
              )
            }
          />
        )}
      </section>

      <CreatePaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

export default DashboardPage;
