import type { PaymentStatus } from "../types/api";
import { statusMeta } from "../utils/status";

interface StatusBadgeProps {
  status: PaymentStatus;
  verbose?: boolean;
}

export function StatusBadge({ status, verbose = false }: StatusBadgeProps) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={`status-badge status-${status.toLowerCase().replace("_", "-")}`}>
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
      {verbose ? meta.label : meta.shortLabel}
    </span>
  );
}
