import { Link } from "react-router-dom";

interface BrandProps {
  compact?: boolean;
  publicHome?: boolean;
}

export function Brand({ compact = false, publicHome = false }: BrandProps) {
  return (
    <Link className="brand" to={publicHome ? "/" : "/dashboard"} aria-label="PayPruf with Wema Bank — home">
      <span className="brand-mark" aria-hidden="true">
        <img src="/wema-bank-logo.png" alt="" />
      </span>
      <span className="brand-lockup">
        <strong>PayPruf</strong>
        {!compact && <small>Proof beyond the receipt.</small>}
      </span>
    </Link>
  );
}
