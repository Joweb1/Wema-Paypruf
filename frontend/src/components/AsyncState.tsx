import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export function PageLoader({ label = "Loading payment information" }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="loader-ring" aria-hidden="true" />
      <strong>{label}</strong>
      <span>This should only take a moment.</span>
    </div>
  );
}

interface StatePanelProps {
  title: string;
  message: string;
  tone?: "error" | "empty";
  action?: ReactNode;
}

export function StatePanel({ title, message, tone = "error", action }: StatePanelProps) {
  const Icon = tone === "empty" ? Inbox : AlertCircle;
  return (
    <section className={`state-panel state-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="state-icon"><Icon size={26} aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <div className="state-actions">{action}</div>}
    </section>
  );
}

export function RetryButton({ onClick, label = "Try again" }: { onClick: () => void; label?: string }) {
  return <button className="button button-secondary" type="button" onClick={onClick}><RefreshCw size={17} /> {label}</button>;
}
