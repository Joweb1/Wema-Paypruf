export const statusMeta = {
  CONFIRMED: {
    label: "Confirmed",
    tone: "confirmed",
    description: "Verified against the merchant-side transaction ledger.",
  },
  PENDING: {
    label: "Pending",
    tone: "pending",
    description: "Receipt processed; transaction awaiting settlement.",
  },
  MISMATCH: {
    label: "Mismatch",
    tone: "mismatch",
    description: "Discrepancy detected in amount, sender, or reference.",
  },
  NOT_RECEIVED: {
    label: "Not received",
    tone: "not-received",
    description: "No matching credit found in bank records.",
  },
};
