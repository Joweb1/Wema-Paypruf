const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIGERIAN_PHONE_RE = /^(?:\+234|0)[789][01]\d{8}$/;
const WEMA_ACCOUNT_RE = /^\d{10}$/;

export function validateIdentifier(method, value) {
  const trimmed = value.trim();
  if (!trimmed) {
    if (method === "email") return "Enter your email address.";
    if (method === "phone") return "Enter your Nigerian phone number.";
    return "Enter your 10-digit Wema account number.";
  }
  if (method === "email" && !EMAIL_RE.test(trimmed)) {
    return "Enter a valid email address.";
  }
  if (method === "phone" && !NIGERIAN_PHONE_RE.test(trimmed.replace(/\s+/g, ""))) {
    return "Enter a valid 11-digit Nigerian phone number (e.g. 08012345678 or +234...).";
  }
  if (method === "wema" && !WEMA_ACCOUNT_RE.test(trimmed)) {
    return "Wema account number must be exactly 10 digits.";
  }
  return null;
}

export function validatePassword(password) {
  if (!password) return "Enter a password.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validatePasswordMatch(password, confirm) {
  if (!confirm) return "Confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function validateFullName(name) {
  if (!name || !name.trim()) return "Enter your full name.";
  if (name.trim().length < 2) return "Name is too short.";
  return null;
}

export function validateWema(accountNumber) {
  const trimmed = (accountNumber || "").trim();
  if (!trimmed) return "Enter your 10-digit Wema account number.";
  if (!WEMA_ACCOUNT_RE.test(trimmed)) return "Wema account number must be exactly 10 digits.";
  return null;
}

export function validateAccountName(name) {
  if (!name || !name.trim()) return "Enter your account name.";
  if (name.trim().length < 2) return "Account name is too short.";
  return null;
}
