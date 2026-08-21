import { RefreshCw, ShieldAlert, Sparkles } from "lucide-react";

export function PageLoader({ label = "Loading PayPruf" }) {
  if (!label) return null;
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="loader-ring" aria-hidden="true" />
      <strong>{label}</strong>
      <span>Checking verification engines</span>
    </div>
  );
}

export function StatePanel({
  title,
  message,
  action,
  tone = "default",
  icon: CustomIcon,
}) {
  const Icon = CustomIcon || (tone === "empty" ? Sparkles : ShieldAlert);
  return (
    <div className={`state-panel state-${tone}`}>
      <span className="state-icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <div className="state-actions">{action}</div>}
    </div>
  );
}

export function RetryButton({ onClick, label = "Try again" }) {
  return (
    <button className="button button-secondary" type="button" onClick={onClick}>
      <RefreshCw size={16} aria-hidden="true" /> {label}
    </button>
  );
}
