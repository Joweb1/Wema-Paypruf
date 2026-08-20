export function formatMoney(value?: string | number | null, currency = "NGN") {
  if (value == null) return "—";
  if (typeof value === "string") {
    const normalized = value.trim();
    const match = normalized.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) return "—";
    const [, sign, whole, rawFraction = ""] = match;
    const formattedWhole = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(BigInt(whole));
    const fraction = rawFraction.slice(0, 2).padEnd(2, "0");
    const displayedFraction = fraction === "00" ? "" : `.${fraction}`;
    const symbol = currency === "NGN" ? "₦" : `${currency} `;
    return `${sign}${symbol}${formattedWhole}${displayedFraction}`;
  }

  const numeric = value;
  if (!Number.isFinite(numeric)) return "—";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString("en-NG")}`;
  }
}

export function formatDateTime(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-NG", options ?? {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function customerInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "PP";
}

export function safePublicPath(publicUrl?: string, token?: string) {
  if (token) return `/pay/${encodeURIComponent(token)}`;
  if (!publicUrl) return "/dashboard";
  try {
    const url = new URL(publicUrl, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return publicUrl;
  }
}
