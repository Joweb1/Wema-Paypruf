export const formatMoney = (amount, currency = "NGN") => {
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export const formatDateTime = (value, options) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    if (options && typeof options === "object" && Object.keys(options).length > 0) {
      return new Intl.DateTimeFormat("en-NG", options).format(date);
    }
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString("en-NG");
  }
};

export const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const customerInitials = (name) => {
  if (!name) return "PY";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const safePublicPath = (publicUrl, token) => {
  if (publicUrl) {
    try {
      const parsed = new URL(publicUrl);
      return parsed.pathname;
    } catch {
      // Fallback below
    }
  }
  return `/pay/${encodeURIComponent(token || "")}`;
};
