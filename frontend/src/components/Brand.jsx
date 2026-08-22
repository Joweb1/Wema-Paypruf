import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Brand({ publicHome = false, isHeader = true, size = 38 }) {
  const { user } = useAuth();

  return (
    <Link className="brand" to={user ? "/dashboard" : "/"} style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
      <span className="brand-mark" aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src="/wemalogo.jpg"
          alt="Wema Paypruf Logo"
          style={{
            height: typeof size === "number" ? `${size}px` : size,
            width: "auto",
            maxWidth: "48px",
            objectFit: "contain",
            borderRadius: "6px",
            display: "block",
          }}
        />
      </span>
      <span className="brand-lockup">
        <strong>{isHeader ? "Wema Paypruf" : "PayPruf"}</strong>
        <small>Proof beyond the receipt</small>
      </span>
    </Link>
  );
}
