import type { RegistrationMethod } from "../types/api";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NIGERIAN_PHONE_RE = /^\+234[789]\d{9}$/;
const WEMA_RE = /^\d{10}$/;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Normalize a Nigerian phone number to +2348012345678. Returns null if invalid. */
export function normalizePhone(value: string): string | null {
  let raw = value.trim().replace(/\s|-/g, "");
  if (raw.startsWith("00")) raw = "+" + raw.slice(2);
  const digits = raw.replace(/\D/g, "");

  let normalized: string | null = null;
  if (digits.startsWith("234") && digits.length === 13) normalized = `+${digits}`;
  else if (digits.startsWith("0") && digits.length === 11) normalized = `+234${digits.slice(1)}`;
  else if (digits.length === 10 && !digits.startsWith("0")) normalized = `+234${digits}`;

  if (normalized && NIGERIAN_PHONE_RE.test(normalized)) return normalized;
  return null;
}

export function validateFullName(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return "Enter your full name.";
  if (cleaned.length > 120) return "That name is too long.";
  return null;
}

export function validateEmail(value: string): string | null {
  const cleaned = normalizeEmail(value);
  if (!cleaned) return "Enter your email address.";
  if (!EMAIL_RE.test(cleaned)) return "Enter a valid email address.";
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return "Enter your phone number.";
  if (!normalizePhone(value)) {
    return "Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.";
  }
  return null;
}

export function validateWema(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Enter your Wema account number.";
  if (!WEMA_RE.test(digits)) return "The Wema account number must be exactly 10 digits.";
  return null;
}

export function validateIdentifier(method: RegistrationMethod, value: string): string | null {
  if (method === "email") return validateEmail(value);
  if (method === "phone") return validatePhone(value);
  if (method === "wema") return validateWema(value);
  return "Choose how you want to register.";
}

export function validatePassword(value: string): string | null {
  if (!value) return "Create a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!PASSWORD_RE.test(value)) {
    return "Password must include an uppercase letter, a lowercase letter, and a number.";
  }
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return "Confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function validateAccountName(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return "Enter the account name.";
  if (cleaned.length > 120) return "That account name is too long.";
  return null;
}
