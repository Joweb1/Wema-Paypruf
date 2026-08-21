import { AlertTriangle, CheckCircle2, Clock3, SearchX } from "lucide-react";
import { statusMeta } from "../utils/status";

const icons = {
  CONFIRMED: CheckCircle2,
  PENDING: Clock3,
  MISMATCH: AlertTriangle,
  NOT_RECEIVED: SearchX,
};

export function StatusBadge({ status, verbose = false }) {
  const meta = statusMeta[status] || statusMeta.PENDING;
  const Icon = icons[status] || Clock3;

  return (
    <span className={`status-badge status-${meta.tone}`}>
      <Icon size={14} aria-hidden="true" />
      <span>{meta.label}</span>
      {verbose && <small>· {meta.description}</small>}
    </span>
  );
}
