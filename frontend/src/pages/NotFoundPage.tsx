import { ArrowLeft, FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <span><FileQuestion size={30} aria-hidden="true" /></span>
      <p className="eyebrow">404 · Page not found</p>
      <h1>This page has moved—or never existed.</h1>
      <p>Return to the PayPruf dashboard to continue managing payment requests.</p>
      <Link className="button button-primary" to="/dashboard"><ArrowLeft size={17} /> Return to dashboard</Link>
    </div>
  );
}
