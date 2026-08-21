import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PayPrufLogoIcon } from "./common/PayPrufLogoIcon";

export function Brand({ publicHome = false }) {
  const { user } = useAuth();

  return (
    <Link className="brand" to={user ? "/dashboard" : "/"}>
      <span className="brand-mark" aria-hidden="true">
        <PayPrufLogoIcon size={44} />
      </span>
      <span className="brand-lockup">
        <strong>PayPruf</strong>
        <small>Proof beyond the receipt</small>
      </span>
    </Link>
  );
}
