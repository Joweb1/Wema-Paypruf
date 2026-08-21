export function formatCurrency(amount, currency = 'NGN') {
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency + ' ';
  return `${symbol}${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'CONFIRMED':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        text: 'text-emerald-700',
        border: 'border-emerald-500',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
      };
    case 'PENDING':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        text: 'text-amber-700',
        border: 'border-amber-500',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500 animate-pulse',
      };
    case 'MISMATCH':
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200',
        text: 'text-rose-700',
        border: 'border-rose-500',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500',
      };
    case 'NOT_RECEIVED':
      return {
        bg: 'bg-slate-100 text-slate-800 border-slate-300',
        text: 'text-slate-700',
        border: 'border-slate-400',
        badge: 'bg-slate-200 text-slate-800 border-slate-300',
        dot: 'bg-slate-400',
      };
    case 'UNDERPAID':
      return {
        bg: 'bg-orange-50 text-orange-800 border-orange-200',
        text: 'text-orange-700',
        border: 'border-orange-500',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
        dot: 'bg-orange-500',
      };
    case 'OVERPAID':
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        text: 'text-blue-700',
        border: 'border-blue-500',
        badge: 'bg-blue-100 text-blue-800 border-blue-300',
        dot: 'bg-blue-500',
      };
    default:
      return {
        bg: 'bg-gray-100 text-gray-800 border-gray-200',
        text: 'text-gray-700',
        border: 'border-gray-300',
        badge: 'bg-gray-100 text-gray-800 border-gray-200',
        dot: 'bg-gray-400',
      };
  }
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}
