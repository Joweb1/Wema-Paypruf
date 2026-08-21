import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="not-found-page">
      <span aria-hidden="true">
        <ShieldAlert size={32} />
      </span>
      <span className="eyebrow">404</span>
      <h1>Page not found</h1>
      <p>
        The page or payment verification link you requested does not exist or
        has expired.
      </p>
      <Link
        className="button button-primary"
        to={user ? "/dashboard" : "/"}
        style={{ marginTop: "20px" }}
      >
        {user ? "Go to Dashboard" : "Go to PayPruf homepage"}
      </Link>
    </div>
  );
}

export default NotFoundPage;
