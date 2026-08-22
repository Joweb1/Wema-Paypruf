import {
  db,
  DEMO_USER_ID,
  DEFAULT_DEMO_USER,
  DEFAULT_REGISTERED_MERCHANTS,
  DEFAULT_FRAUD_REPORTS,
  DEFAULT_DEMO_PAYMENTS,
} from "./db";

export {
  db,
  DEMO_USER_ID,
  DEFAULT_DEMO_USER,
  DEFAULT_REGISTERED_MERCHANTS,
  DEFAULT_FRAUD_REPORTS,
  DEFAULT_DEMO_PAYMENTS,
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export function getErrorMessage(error) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("detail" in error && typeof error.detail === "string") {
      return error.detail;
    }
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An unexpected error occurred. Please try again.";
}

export function resolveApiAssetUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/v1/assets/")) return url;
  return url;
}

function getStoredToken() {
  return localStorage.getItem("paypruf_token") || "";
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem("paypruf_token", token);
  } else {
    localStorage.removeItem("paypruf_token");
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (typeof data === "object" && (data.detail || data.message)) ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // ------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------

  async getSession() {
    try {
      const data = await request("/auth/session", { method: "GET" });
      if (data?.user) {
        await db.setSessionUser(data.user);
      }
      return data;
    } catch (err) {
      // Fallback for offline local test
      const user = await db.getSessionUser();
      return { user };
    }
  },

  async login({ identifier, password }) {
    const cleanId = (identifier || "").trim();
    if (!cleanId || !password) {
      throw new Error("Please enter your account identifier and password.");
    }

    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: cleanId, password }),
      });
      if (data?.token) {
        setStoredToken(data.token);
      }
      if (data?.user) {
        await db.setSessionUser(data.user);
      }
      return data;
    } catch (err) {
      // Demo fallback if network is offline
      if (
        (cleanId === "0123456789" || cleanId.toLowerCase() === "tolafashion@example.com") &&
        (password === "demopassword123" || password === "password123")
      ) {
        setStoredToken("demo_jwt_token");
        await db.setSessionUser(DEFAULT_DEMO_USER);
        return { user: DEFAULT_DEMO_USER, token: "demo_jwt_token" };
      }
      throw err;
    }
  },

  async register({ fullName, method, identifier, password, confirmPassword }) {
    const cleanId = (identifier || "").trim();
    if (!fullName || !cleanId || !password) {
      throw new Error("All fields are required.");
    }
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: fullName.trim(),
        method,
        identifier: cleanId,
        password,
        confirmPassword,
      }),
    });

    if (data?.token) {
      setStoredToken(data.token);
    }
    if (data?.user) {
      await db.setSessionUser(data.user);
    }
    return data;
  },

  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore network failure on logout
    }
    setStoredToken(null);
    await db.clearSession();
    return { success: true };
  },

  // ------------------------------------------
  // MERCHANT PROFILE & ONBOARDING
  // ------------------------------------------

  async getMerchant() {
    try {
      const data = await request("/merchant/profile", { method: "GET" });
      return data;
    } catch (e) {
      const current = (await db.getSessionUser()) || DEFAULT_DEMO_USER;
      return {
        profile: {
          id: current.id,
          wemaAccountNumber: current.wemaAccountNumber || "0123456789",
          accountName: current.accountName || current.fullName || "Tola Fashion Enterprise",
          businessName: current.businessName || "Tola Fashion",
          email: current.email,
          phone: current.phone,
        },
      };
    }
  },

  async completeOnboarding(payload) {
    const data = await request("/merchant/onboarding", {
      method: "POST",
      body: JSON.stringify({
        wemaAccountNumber: payload.wemaAccountNumber,
        accountName: payload.accountName,
        businessName: payload.businessName || payload.accountName,
      }),
    });
    if (data?.user) {
      await db.setSessionUser(data.user);
    }
    return data;
  },

  // ------------------------------------------
  // DASHBOARD & PAYMENTS
  // ------------------------------------------

  async getDashboard() {
    try {
      const data = await request("/merchant/dashboard", { method: "GET" });
      return data;
    } catch (e) {
      const user = (await db.getSessionUser()) || DEFAULT_DEMO_USER;
      const payments = await db.getPaymentsByMerchantId(user.id);
      const confirmed = payments.filter((p) => p.status === "CONFIRMED");
      const pending = payments.filter((p) => p.status === "PENDING");
      const mismatch = payments.filter((p) => p.status === "MISMATCH");
      const notReceived = payments.filter((p) => p.status === "NOT_RECEIVED");
      const sum = (list) => list.reduce((acc, p) => acc + (Number.parseFloat(p.amount) || 0), 0);

      return {
        merchant: {
          id: user.id,
          display_name: user.fullName || user.businessName || "Merchant",
          business_name: user.businessName || user.fullName || "Merchant",
          wema_account_name: user.accountName || user.businessName || "Settlement Account",
          wema_account_number_hint: user.wemaAccountNumber || "0123456789",
        },
        total: { count: payments.length, value: sum(payments) },
        confirmed: { count: confirmed.length, value: sum(confirmed) },
        pending: { count: pending.length, value: sum(pending) },
        mismatch: { count: mismatch.length, value: sum(mismatch) },
        not_received: { count: notReceived.length, value: sum(notReceived) },
        recent_payments: payments,
      };
    }
  },

  async createPayment(input) {
    const data = await request("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        amount: input.amount,
        description: input.description,
        order_note: input.order_note,
        currency: input.currency || "NGN",
        expires_in_hours: input.expires_in_hours || 24,
      }),
    });
    return data;
  },

  async getPayment(paymentId) {
    const data = await request(`/payments/${paymentId}`, { method: "GET" });
    return data;
  },

  async getPublicPayment(token) {
    const data = await request(`/public/pay/${token}`, { method: "GET" });
    return data;
  },

  async uploadPublicReceipt(token, file) {
    const formData = new FormData();
    formData.append("file", file);

    const data = await request(`/public/pay/${token}/receipt`, {
      method: "POST",
      body: formData,
    });
    return data;
  },

  async uploadMerchantReceipt(paymentId, file) {
    const formData = new FormData();
    formData.append("file", file);

    const data = await request(`/payments/${paymentId}/receipt`, {
      method: "POST",
      body: formData,
    });
    return data;
  },

  async verifyPublicPayment(token) {
    const data = await request(`/public/pay/${token}/verify`, {
      method: "POST",
    });
    return data;
  },

  async recheckPublicPayment(token) {
    const data = await request(`/public/pay/${token}/recheck`, {
      method: "POST",
    });
    return data;
  },

  async recheckPayment(paymentId) {
    const data = await request(`/payments/${paymentId}/recheck`, {
      method: "POST",
    });
    return data;
  },

  // ------------------------------------------
  // RISK INTELLIGENCE & ACCOUNT LOOKUP
  // ------------------------------------------

  async lookupAccount(accountNumber) {
    const cleanNumber = String(accountNumber || "").replace(/\D/g, "").slice(0, 10);
    const data = await request(`/risk/lookup/${cleanNumber}`, { method: "GET" });
    return data;
  },

  async checkAccountRisk(accountNumber) {
    const cleanNumber = String(accountNumber || "").replace(/\D/g, "").slice(0, 10);
    const data = await request(`/risk/check/${cleanNumber}`, { method: "GET" });
    return data;
  },

  async reportMerchantAccount(reportInput) {
    const data = await request("/risk/report", {
      method: "POST",
      body: JSON.stringify({
        accountNumber: reportInput.accountNumber,
        merchantName: reportInput.merchantName,
        reason: reportInput.reason,
        details: reportInput.details,
        paymentRef: reportInput.paymentRef,
        reporterName: reportInput.reporterName,
      }),
    });
    return data;
  },
};
