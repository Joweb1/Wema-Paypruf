import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PaymentSummary } from "../types/api";
import { customerInitials, formatDateTime, formatMoney } from "../utils/format";
import { StatusBadge } from "./StatusBadge";

export function PaymentList({ payments }: { payments: PaymentSummary[] }) {
  return (
    <>
      <div className="payment-table-wrap">
        <table className="payment-table">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Reference</th>
              <th scope="col">Amount</th>
              <th scope="col">Created</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <div className="customer-cell">
                    <span className="avatar" aria-hidden="true">{customerInitials(payment.customer_name)}</span>
                    <span><strong>{payment.customer_name}</strong><small>{payment.description}</small></span>
                  </div>
                </td>
                <td><span className="reference-text">{payment.reference}</span></td>
                <td><strong>{formatMoney(payment.amount, payment.currency)}</strong></td>
                <td>{formatDateTime(payment.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td><StatusBadge status={payment.status} /></td>
                <td><Link className="row-link" to={`/payments/${payment.id}`} aria-label={`Open payment ${payment.reference}`}><ArrowUpRight size={18} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="payment-cards">
        {payments.map((payment) => (
          <Link className="payment-card" to={`/payments/${payment.id}`} key={payment.id}>
            <div className="payment-card-head">
              <span className="avatar" aria-hidden="true">{customerInitials(payment.customer_name)}</span>
              <span><strong>{payment.customer_name}</strong><small>{payment.reference}</small></span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </div>
            <div className="payment-card-meta">
              <strong>{formatMoney(payment.amount, payment.currency)}</strong>
              <StatusBadge status={payment.status} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
