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

export function getErrorMessage(error) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

export function resolveApiAssetUrl(url) {
  if (!url) return null;
  return url;
}

export const api = {
  // ------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------

  async getSession() {
    await new Promise((r) => setTimeout(r, 80));
    const user = await db.getSessionUser();
    return { user };
  },

  async login({ identifier, password }) {
    await new Promise((r) => setTimeout(r, 300));
    const cleanId = (identifier || "").trim();
    if (!cleanId || !password) {
      const err = new Error("Please enter your account identifier and password.");
      err.code = "INVALID_INPUT";
      throw err;
    }

    // 1. Search in persistent DB
    const user = await db.findUserByIdentifier(cleanId);

    if (user) {
      if (user.password && user.password !== password) {
        const err = new Error("Invalid login credentials. Please check your password.");
        err.code = "INVALID_CREDENTIALS";
        throw err;
      }

      await db.setSessionUser(user);
      return { user, token: `jwt_${user.id}_${Date.now()}` };
    }

    // 2. Fallback check for default demo credentials
    const isDemoId =
      cleanId === "0123456789" ||
      cleanId.toLowerCase() === "tolafashion@example.com" ||
      cleanId === "08012345678" ||
      cleanId === DEMO_USER_ID;

    if (isDemoId && (password === "demopassword123" || password === "password123")) {
      await db.setSessionUser(DEFAULT_DEMO_USER);
      return { user: DEFAULT_DEMO_USER, token: "demo_jwt_token" };
    }

    const err = new Error(
      "No account found matching this identifier. Please check your details or create a new account."
    );
    err.code = "USER_NOT_FOUND";
    throw err;
  },

  async register({ fullName, method, identifier, password, confirmPassword }) {
    await new Promise((r) => setTimeout(r, 350));
    const cleanId = (identifier || "").trim();

    if (!fullName || !cleanId || !password) {
      throw new Error("All fields are required.");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    // Check if identifier is already taken
    const existing = await db.findUserByIdentifier(cleanId);
    if (existing) {
      throw new Error(
        `An account is already registered with this ${
          method === "email" ? "email" : method === "phone" ? "phone number" : "account number"
        }. Please sign in instead.`
      );
    }

    const newUser = await db.createUser({
      fullName: fullName.trim(),
      email: method === "email" ? cleanId : `${cleanId.replace(/\D/g, "") || Date.now()}@paypruf.ng`,
      phone: method === "phone" ? cleanId : "",
      wemaAccountNumber: method === "wema" ? cleanId : "",
      accountName: fullName.trim(),
      businessName: fullName.trim(),
      password,
      merchantOnboardingCompleted: method === "wema",
    });

    await db.setSessionUser(newUser);
    return { user: newUser, token: `jwt_${newUser.id}_${Date.now()}` };
  },

  async logout() {
    await new Promise((r) => setTimeout(r, 60));
    await db.clearSession();
    return { success: true };
  },

  // ------------------------------------------
  // MERCHANT PROFILE & ONBOARDING
  // ------------------------------------------

  async getMerchant() {
    await new Promise((r) => setTimeout(r, 100));
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
  },

  async completeOnboarding(payload) {
    await new Promise((r) => setTimeout(r, 300));
    const current = (await db.getSessionUser()) || DEFAULT_DEMO_USER;

    const updated = await db.updateUser(current.id, {
      ...payload,
      merchantOnboardingCompleted: true,
    });

    return { user: updated };
  },

  // ------------------------------------------
  // DASHBOARD & PAYMENTS
  // ------------------------------------------

  async getDashboard() {
    await new Promise((r) => setTimeout(r, 150));
    const user = (await db.getSessionUser()) || DEFAULT_DEMO_USER;
    const payments = await db.getPaymentsByMerchantId(user.id);

    const confirmed = payments.filter((p) => p.status === "CONFIRMED");
    const pending = payments.filter((p) => p.status === "PENDING");
    const mismatch = payments.filter((p) => p.status === "MISMATCH");
    const notReceived = payments.filter((p) => p.status === "NOT_RECEIVED");

    const sum = (list) =>
      list.reduce((acc, p) => acc + (Number.parseFloat(p.amount) || 0), 0);

    return {
      merchant: {
        id: user.id,
        display_name: user.fullName || user.businessName || "Merchant",
        business_name: user.businessName || user.fullName || "Merchant",
        wema_account_name:
          user.accountName || user.businessName || user.fullName || "Settlement Account",
        wema_account_number_hint:
          user.wemaAccountNumber || "0123456789",
      },
      total: {
        count: payments.length,
        value: sum(payments),
      },
      confirmed: {
        count: confirmed.length,
        value: sum(confirmed),
      },
      pending: {
        count: pending.length,
        value: sum(pending),
      },
      mismatch: {
        count: mismatch.length,
        value: sum(mismatch),
      },
      not_received: {
        count: notReceived.length,
        value: sum(notReceived),
      },
      recent_payments: payments,
    };
  },

  async createPayment(input) {
    await new Promise((r) => setTimeout(r, 250));
    const user = (await db.getSessionUser()) || DEFAULT_DEMO_USER;

    const newPayment = await db.createPayment({
      ...input,
      merchant_id: user.id,
    });

    return newPayment;
  },

  async getPayment(paymentId) {
    await new Promise((r) => setTimeout(r, 120));
    const payment = await db.findPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment record not found.");
    }

    const merchantUser =
      (payment.merchant_id ? await db.findUserById(payment.merchant_id) : null) ||
      (await db.getSessionUser()) ||
      DEFAULT_DEMO_USER;

    return {
      payment,
      merchant: {
        business_name: merchantUser.businessName || merchantUser.fullName || "Merchant",
        bank_name: "Wema Bank (Sandbox)",
        wema_account_name:
          merchantUser.accountName || merchantUser.businessName || "Settlement Account",
        wema_account_number: merchantUser.wemaAccountNumber || "0123456789",
        wema_account_number_hint:
          merchantUser.wemaAccountNumber || "0123456789",
      },
      receipt: payment.receipt,
      transaction: payment.transaction,
      verification: payment.verification,
      timeline: payment.verification?.timeline || [],
    };
  },

  async getPublicPayment(token) {
    await new Promise((r) => setTimeout(r, 150));
    const payment = await db.findPaymentByToken(token);
    if (!payment) {
      throw new Error("Payment link is invalid or has expired.");
    }

    const merchantUser =
      (payment.merchant_id ? await db.findUserById(payment.merchant_id) : null) ||
      DEFAULT_DEMO_USER;

    return {
      payment,
      merchant: {
        business_name: merchantUser.businessName || merchantUser.fullName || "PayPruf Merchant",
      },
      payment_instructions: {
        bank_name: "Wema Bank (Demo Sandbox)",
        account_name:
          merchantUser.accountName || merchantUser.businessName || "Settlement Account",
        account_number: merchantUser.wemaAccountNumber || "0123456789",
      },
      receipt: payment.receipt,
      verification: payment.verification,
    };
  },

  async uploadPublicReceipt(token, file) {
    await new Promise((r) => setTimeout(r, 500));
    const payment = await db.findPaymentByToken(token);
    if (!payment) throw new Error("Payment not found.");

    const merchantUser =
      (payment.merchant_id ? await db.findUserById(payment.merchant_id) : null) ||
      DEFAULT_DEMO_USER;

    const previewUrl =
      file && typeof file === "object" && file.type?.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;

    const receipt = {
      original_filename: file?.name || "receipt.png",
      mime_type: file?.type || "image/png",
      size_bytes: file?.size || 350000,
      preview_url: previewUrl,
      amount: payment.amount,
      currency: payment.currency || "NGN",
      reference: `NIP/WEMA/${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      bank: "Wema Bank / ALAT",
      status_text: "Successful Transaction",
      sender_name: payment.customer_name.toUpperCase(),
      recipient_name: (
        merchantUser.accountName || merchantUser.businessName || "MERCHANT"
      ).toUpperCase(),
      transaction_date: new Date().toISOString(),
      account_hint: merchantUser.wemaAccountNumber || "0123456789",
      confidence: 0.97,
      raw_text: `RECEIPT\nAmount: NGN ${payment.amount}\nTo: ${(
        merchantUser.accountName || "MERCHANT"
      ).toUpperCase()}\nFrom: ${payment.customer_name.toUpperCase()}\nStatus: SUCCESSFUL`,
    };

    const updated = await db.updatePayment(payment.id, {
      receipt,
      status: "PENDING",
      status_reason: "Receipt uploaded. Bank ledger reconciliation in progress.",
    });

    return updated.receipt;
  },

  async uploadMerchantReceipt(paymentId, file) {
    return this.uploadPublicReceipt(paymentId, file);
  },

  async verifyPublicPayment(token) {
    await new Promise((r) => setTimeout(r, 600));
    const payment = await db.findPaymentByToken(token);
    if (!payment) throw new Error("Payment not found.");

    const merchantUser =
      (payment.merchant_id ? await db.findUserById(payment.merchant_id) : null) ||
      DEFAULT_DEMO_USER;

    const verification = {
      payment_id: payment.id,
      status: "CONFIRMED",
      reason_code: "MATCH_EXACT",
      reason: "Payment verified against merchant ledger records.",
      verified_at: new Date().toISOString(),
      amount_match: true,
      reference_match: true,
      currency_match: true,
      merchant_match: true,
      date_match: true,
      comparison: {
        expected_amount: payment.amount,
        receipt_amount: payment.amount,
        received_amount: payment.amount,
        receipt_reference: payment.receipt?.reference || payment.reference,
        transaction_reference: payment.receipt?.reference || payment.reference,
      },
      timeline: [
        {
          title: "Payment link generated",
          timestamp: payment.created_at,
          state: "complete",
        },
        {
          title: "Receipt uploaded",
          timestamp: new Date(Date.now() - 5000).toISOString(),
          state: "complete",
        },
        {
          title: "Merchant record matched",
          timestamp: new Date().toISOString(),
          state: "complete",
        },
      ],
      transaction: {
        provider: "WEMA_NIP",
        provider_reference:
          payment.receipt?.reference ||
          `NIP/WEMA/${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        payment_reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency || "NGN",
        status: "SUCCESS",
        sender_name: payment.customer_name,
        recipient_account_hint: merchantUser.wemaAccountNumber || "0123456789",
        transaction_date: new Date().toISOString(),
      },
    };

    const updated = await db.updatePayment(payment.id, {
      status: "CONFIRMED",
      status_reason: "Verified against Wema sandbox transaction record.",
      verification,
      transaction: verification.transaction,
    });

    return updated.verification;
  },

  async recheckPublicPayment(token) {
    return this.verifyPublicPayment(token);
  },

  async recheckPayment(paymentId) {
    return this.verifyPublicPayment(paymentId);
  },

  // ------------------------------------------
  // RISK INTELLIGENCE & ACCOUNT LOOKUP
  // ------------------------------------------

  async lookupAccount(accountNumber) {
    await new Promise((r) => setTimeout(r, 250));
    return db.lookupMerchantAccount(accountNumber);
  },

  async checkAccountRisk(accountNumber) {
    await new Promise((r) => setTimeout(r, 350));
    const cleanNumber = String(accountNumber || "").replace(/\D/g, "").slice(0, 10);
    const lookup = await this.lookupAccount(cleanNumber);
    const accountReports = await db.findFraudReportsByAccount(cleanNumber);

    const hasReports = accountReports.length > 0;
    const totalIncidentsCount = accountReports.reduce((acc, curr) => {
      return acc + (curr.incidents?.length || curr.reportersCount || 1);
    }, 0);

    const distinctReporters = accountReports.reduce((acc, curr) => {
      return acc + (curr.reportersCount || 1);
    }, 0);

    return {
      accountNumber: cleanNumber,
      accountName: lookup.accountName,
      businessName: lookup.businessName,
      registered: lookup.registered,
      hasReports,
      reportCount: totalIncidentsCount,
      reportersCount: distinctReporters,
      reports: accountReports,
      riskLevel: hasReports ? "FLAGGED" : "CLEAN",
      summary: hasReports
        ? `Community Alert: ${totalIncidentsCount} Report(s) Found`
        : "No Incidents on Record",
      alertTitle: hasReports
        ? "Caution Advised: Account Flagged"
        : "No Community Reports Found",
      alertMessage: hasReports
        ? "This account has received reports from other users. Exercise caution."
        : "PayPruf has no reported incidents associated with this account.",
      advisoryDisclaimer:
        "Advisory Risk Indicator: The PayPruf Risk Intelligence tool is an advisory crowd-sourced register. Regardless of report status, always require full bank ledger reconciliation before dispatching orders.",
    };
  },

  async reportMerchantAccount(reportInput) {
    await new Promise((r) => setTimeout(r, 400));
    await db.createOrUpdateFraudReport(reportInput);
    return {
      success: true,
      message: "Fraud report successfully registered in PayPruf Risk Intelligence register.",
    };
  },
};
