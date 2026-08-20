import type {
  ApiErrorEnvelope,
  AuthUser,
  CreatePaymentInput,
  DashboardSummary,
  LoginPayload,
  MerchantMe,
  OnboardingPayload,
  PaymentDetail,
  PaymentListResponse,
  PaymentSummary,
  PublicPaymentDetail,
  RegisterPayload,
  UploadReceiptResponse,
  Verification,
} from "../types/api";

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredBase || "/api").replace(/\/$/, "");

export function resolveApiAssetUrl(path?: string | null) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith("/api/")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, code = "REQUEST_FAILED", status = 0, details: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && "message" in error);
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      // Send the HttpOnly session cookie with every request.
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "PayPruf cannot reach the verification service. Check that the API is running and try again.",
      "API_UNAVAILABLE",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body: unknown = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    if (isErrorEnvelope(body)) {
      throw new ApiError(body.error.message, body.error.code, response.status, body.error.details);
    }
    throw new ApiError(
      response.status >= 500
        ? "The verification service hit a problem. Please try again."
        : "PayPruf could not complete that request.",
      `HTTP_${response.status}`,
      response.status,
    );
  }
  return body as T;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export const api = {
  getDashboard: (signal?: AbortSignal) =>
    apiRequest<DashboardSummary>("/dashboard/summary", { signal }),

  register: (input: RegisterPayload) =>
    apiRequest<AuthUser>("/auth/register", { method: "POST", body: JSON.stringify(input) }),

  login: (input: LoginPayload) =>
    apiRequest<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify(input) }),

  logout: () => apiRequest<{ status: string }>("/auth/logout", { method: "POST" }),

  getMe: (signal?: AbortSignal) =>
    apiRequest<AuthUser>("/auth/me", { signal }),

  getMerchant: (signal?: AbortSignal) =>
    apiRequest<MerchantMe>("/merchant/me", { signal }),

  completeOnboarding: (input: OnboardingPayload) =>
    apiRequest<MerchantMe>("/merchant/onboarding", { method: "POST", body: JSON.stringify(input) }),

  listPayments: (params: { status?: string; search?: string; limit?: number; offset?: number } = {}, signal?: AbortSignal) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") search.set(key, String(value));
    });
    const suffix = search.size ? `?${search.toString()}` : "";
    return apiRequest<PaymentListResponse>(`/payments${suffix}`, { signal });
  },

  createPayment: (input: CreatePaymentInput) =>
    apiRequest<PaymentSummary>("/payments", { method: "POST", body: JSON.stringify(input) }),

  getPayment: (paymentId: string, signal?: AbortSignal) =>
    apiRequest<PaymentDetail>(`/payments/${encodeURIComponent(paymentId)}`, { signal }),

  getPublicPayment: (token: string, signal?: AbortSignal) =>
    apiRequest<PublicPaymentDetail>(`/public/payments/${encodeURIComponent(token)}`, { signal }),

  getVerification: (paymentId: string, signal?: AbortSignal) =>
    apiRequest<Verification>(`/payments/${encodeURIComponent(paymentId)}/verification`, { signal }),

  uploadPublicReceipt: (token: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<UploadReceiptResponse>(`/public/payments/${encodeURIComponent(token)}/receipt`, {
      method: "POST",
      body,
    });
  },

  uploadMerchantReceipt: (paymentId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<UploadReceiptResponse>(`/payments/${encodeURIComponent(paymentId)}/receipt`, {
      method: "POST",
      body,
    });
  },

  verifyPublicPayment: (token: string) =>
    apiRequest<Verification>(`/public/payments/${encodeURIComponent(token)}/verify`, { method: "POST" }),

  recheckPublicPayment: (token: string) =>
    apiRequest<Verification>(`/public/payments/${encodeURIComponent(token)}/recheck`, { method: "POST" }),

  verifyPayment: (paymentId: string) =>
    apiRequest<Verification>(`/payments/${encodeURIComponent(paymentId)}/verify`, { method: "POST" }),

  recheckPayment: (paymentId: string) =>
    apiRequest<Verification>(`/payments/${encodeURIComponent(paymentId)}/recheck`, { method: "POST" }),
};
