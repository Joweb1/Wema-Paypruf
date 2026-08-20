import { AlertTriangle, Check, Clock3, SearchX, type LucideIcon } from "lucide-react";
import type { PaymentStatus } from "../types/api";

export const statusMeta: Record<PaymentStatus, { label: string; shortLabel: string; icon: LucideIcon }> = {
  CONFIRMED: { label: "Payment confirmed", shortLabel: "Confirmed", icon: Check },
  PENDING: { label: "Payment pending", shortLabel: "Pending", icon: Clock3 },
  MISMATCH: { label: "Payment mismatch", shortLabel: "Mismatch", icon: AlertTriangle },
  NOT_RECEIVED: { label: "Payment not received", shortLabel: "Not received", icon: SearchX },
};
