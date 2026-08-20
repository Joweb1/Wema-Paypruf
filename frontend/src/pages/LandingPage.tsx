import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, WalletCards } from "lucide-react";
import { Brand } from "../components/Brand";

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <Brand publicHome />
      </header>
      <main className="landing-main">
        <section className="landing-hero">
          <span className="eyebrow">PayPruf MVP</span>
          <h1>Proof beyond the receipt.</h1>
          <p>
            Turn customer payment claims into structured, verifiable payment
            records. Receipts are evidence. Merchant-side records confirm
            payment.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary button-large" to="/register">
              Create account <ArrowRight size={18} />
            </Link>
            <Link className="button button-secondary button-large" to="/login">
              Sign in
            </Link>
          </div>
        </section>

        <section className="landing-cards">
          <article className="landing-card">
            <span className="landing-card-icon">
              <ShieldCheck size={22} />
            </span>
            <strong>Verified outcomes</strong>
            <p>
              PayPruf checks merchant-side transaction records before confirming
              a payment — not just OCR.
            </p>
          </article>
          <article className="landing-card">
            <span className="landing-card-icon">
              <WalletCards size={22} />
            </span>
            <strong>Wema-ready</strong>
            <p>
              Connect your Wema Bank receiving account during setup and start
              verifying transfers in minutes.
            </p>
          </article>
        </section>
      </main>
      <footer className="landing-footer">
        <span>PayPruf</span>
        <span>Receipt intelligence is supporting evidence. Merchant-side records confirm payment.</span>
      </footer>
    </div>
  );
}
