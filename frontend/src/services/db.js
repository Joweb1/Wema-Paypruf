/**
 * PayPruf Database & Storage Abstraction Layer
 *
 * Designed with a Repository/Adapter pattern for easy transition to:
 * - Supabase (PostgreSQL / PostgREST)
 * - Firebase (Cloud Firestore & Firebase Auth)
 *
 * Current Adapter: LocalStorageDatabaseAdapter (100% persistent in browser storage)
 */

const STORAGE_KEYS = {
  USERS: "paypruf_db_users",
  PAYMENTS: "paypruf_db_payments",
  FRAUD_REPORTS: "paypruf_db_fraud_reports",
  MERCHANTS_DIR: "paypruf_db_merchants_directory",
  SESSION: "paypruf_db_session",
};

// ==========================================
// SEED & MOCK DATA (Retained for Testing)
// ==========================================

export const DEMO_USER_ID = "usr_wema_demo_01";

export const DEFAULT_DEMO_USER = {
  id: DEMO_USER_ID,
  fullName: "Tola Adeyemi",
  email: "tolafashion@example.com",
  phone: "08012345678",
  wemaAccountNumber: "0123456789",
  accountName: "Tola Fashion Enterprise",
  businessName: "Tola Fashion",
  password: "demopassword123",
  merchantOnboardingCompleted: true,
  createdAt: new Date("2026-01-15T08:00:00Z").toISOString(),
};

export const DEFAULT_REGISTERED_MERCHANTS = [
  {
    accountNumber: "0123456789",
    accountName: "Tola Fashion Enterprise",
    businessName: "Tola Fashion",
    registered: true,
  },
  {
    accountNumber: "0987654321",
    accountName: "Apex Luxury Wears Ltd",
    businessName: "Apex Luxury Wears",
    registered: true,
  },
  {
    accountNumber: "5544332211",
    accountName: "QuickGadgets Direct Nigeria",
    businessName: "QuickGadgets Direct",
    registered: true,
  },
  {
    accountNumber: "2233445566",
    accountName: "Zara Organics Lagos",
    businessName: "Zara Organics",
    registered: true,
  },
  {
    accountNumber: "1122334455",
    accountName: "Kano Textiles & Dyeing",
    businessName: "Kano Textiles",
    registered: true,
  },
];

export const DEFAULT_FRAUD_REPORTS = [
  {
    id: "rep_seed_01",
    accountNumber: "0987654321",
    merchantName: "Apex Luxury Wears Ltd",
    reportedBy: "3 Verified Merchants",
    reportersCount: 3,
    date: "8/12/2026",
    reason: "Reported 4 times for issuing fake payment receipts and reverse transfers",
    details:
      "Merchant repeatedly shared altered screenshot receipts claiming successful transfer, then initiated reversal claims against suppliers.",
    incidents: [
      {
        date: "8/12/2026",
        reporter: "3 Verified Merchants",
        summary: "Reported 4 times for issuing fake payment receipts and reverse transfers",
        description:
          "Disputed authentic transfer and claimed non-receipt of verified funds after physical goods collection.",
      },
      {
        date: "8/10/2026",
        reporter: "1 Verified Customer",
        summary: "Fake payment receipt generation",
        description:
          "Customer paid via transfer; merchant altered confirmation reference to claim underpayment.",
      },
      {
        date: "8/05/2026",
        reporter: "Verified Supplier",
        summary: "Reverse transfer dispute attempt",
        description: "Initiated bank recall claiming transaction was uncompleted.",
      },
      {
        date: "7/29/2026",
        reporter: "Verified Merchant",
        summary: "Deceptive banking details",
        description: "Provided mismatched third-party beneficiary account for commercial transaction.",
      },
    ],
    createdAt: new Date("2026-08-12T14:30:00Z").toISOString(),
  },
  {
    id: "rep_seed_02",
    accountNumber: "5544332211",
    merchantName: "QuickGadgets Direct Nigeria",
    reportedBy: "2 Verified Customers",
    reportersCount: 2,
    date: "8/14/2026",
    reason: "Reported 2 times for non-delivery of items following verified transfer payment",
    details: "Refused shipment after verified customer payment was confirmed in banking ledger.",
    incidents: [
      {
        date: "8/14/2026",
        reporter: "2 Verified Customers",
        summary: "Non-fulfillment after verified settlement",
        description:
          "Order remained unfulfilled 14 days after verified Wema bank transfer was confirmed.",
      },
    ],
    createdAt: new Date("2026-08-14T10:15:00Z").toISOString(),
  },
];

export const DEFAULT_DEMO_PAYMENTS = [
  {
    id: "pay_demo_101",
    merchant_id: DEMO_USER_ID,
    customer_name: "Chinedu Okafor",
    customer_phone: "+2348023456789",
    amount: "25000.00",
    currency: "NGN",
    description: "Premium Aso-Oke Wedding Fabric (3 yards)",
    order_note: "Blue design sample delivery included",
    reference: "PRF-2026-CHIN-01",
    public_token: "tok_chin_98234",
    public_url: "/pay/tok_chin_98234",
    status: "CONFIRMED",
    status_reason: "Matched with incoming Wema NIP credit of ₦25,000.00 from Chinedu Okafor.",
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
    is_expired: false,
    receipt: {
      original_filename: "wema_transfer_receipt_25k.png",
      mime_type: "image/png",
      size_bytes: 428000,
      preview_url:
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
      amount: "25000.00",
      currency: "NGN",
      reference: "NIP/WEMA/202603120194",
      bank: "Wema Bank / ALAT",
      status_text: "Successful Transaction",
      sender_name: "CHINEDU OKAFOR",
      recipient_name: "TOLA FASHION ENTERPRISE",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 3.8).toISOString(),
      account_hint: "0123456789",
      confidence: 0.98,
      raw_text:
        "TRANSACTION RECEIPT\nWEMA BANK PLC\nAmount: NGN 25,000.00\nBeneficiary: TOLA FASHION ENTERPRISE\nAccount: 0123456789\nSender: CHINEDU OKAFOR\nRef: NIP/WEMA/202603120194\nStatus: SUCCESSFUL",
    },
    transaction: {
      provider: "WEMA_NIP",
      provider_reference: "NIP/WEMA/202603120194",
      payment_reference: "PRF-2026-CHIN-01",
      amount: "25000.00",
      currency: "NGN",
      status: "SUCCESS",
      sender_name: "Chinedu Okafor",
      recipient_account_hint: "0123456789",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 3.8).toISOString(),
    },
    verification: {
      payment_id: "pay_demo_101",
      status: "CONFIRMED",
      reason_code: "MATCH_EXACT",
      reason:
        "Payment verified. Receipt amount, merchant bank credit, and reference match completely.",
      verified_at: new Date(Date.now() - 3600 * 1000 * 3.7).toISOString(),
      amount_match: true,
      reference_match: true,
      currency_match: true,
      merchant_match: true,
      date_match: true,
      comparison: {
        expected_amount: "25000.00",
        receipt_amount: "25000.00",
        received_amount: "25000.00",
        receipt_reference: "NIP/WEMA/202603120194",
        transaction_reference: "NIP/WEMA/202603120194",
      },
      timeline: [
        {
          title: "Payment link generated",
          timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
          state: "complete",
        },
        {
          title: "Customer opened payment page",
          timestamp: new Date(Date.now() - 3600 * 1000 * 3.9).toISOString(),
          state: "complete",
        },
        {
          title: "Receipt uploaded & OCR extracted",
          timestamp: new Date(Date.now() - 3600 * 1000 * 3.8).toISOString(),
          state: "complete",
        },
        {
          title: "Merchant ledger matched (Wema sandbox)",
          timestamp: new Date(Date.now() - 3600 * 1000 * 3.7).toISOString(),
          state: "complete",
        },
      ],
    },
  },
  {
    id: "pay_demo_102",
    merchant_id: DEMO_USER_ID,
    customer_name: "Aisha Bello",
    customer_phone: "+2348034567890",
    amount: "45000.00",
    currency: "NGN",
    description: "Custom Embellished Abaya Set",
    order_note: "Size M with matching headscarf",
    reference: "PRF-2026-AISH-02",
    public_token: "tok_aish_11892",
    public_url: "/pay/tok_aish_11892",
    status: "PENDING",
    status_reason:
      "Customer uploaded receipt for ₦45,000.00. Bank transfer confirmation is currently processing.",
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    is_expired: false,
    receipt: {
      original_filename: "receipt_aisha_abaya.jpg",
      mime_type: "image/jpeg",
      size_bytes: 312000,
      preview_url:
        "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80",
      amount: "45000.00",
      currency: "NGN",
      reference: "FT26081290382",
      bank: "GTBank / Squad",
      status_text: "Pending Settlement",
      sender_name: "AISHA BELLO",
      recipient_name: "TOLA FASHION",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
      account_hint: "0123456789",
      confidence: 0.94,
      raw_text:
        "TRANSFER SLIP\nGTBank NIP\nAmount: NGN 45,000.00\nBeneficiary: TOLA FASHION\nSender: AISHA BELLO\nRef: FT26081290382\nStatus: PENDING",
    },
    transaction: {
      provider: "WEMA_NIP",
      provider_reference: "FT26081290382",
      payment_reference: "PRF-2026-AISH-02",
      amount: "45000.00",
      currency: "NGN",
      status: "PENDING",
      sender_name: "Aisha Bello",
      recipient_account_hint: "0123456789",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
    },
    verification: {
      payment_id: "pay_demo_102",
      status: "PENDING",
      reason_code: "PROCESSING_SETTLEMENT",
      reason:
        "Receipt details successfully captured. Bank settlement is still in progress.",
      verified_at: new Date(Date.now() - 3600 * 1000 * 1.4).toISOString(),
      amount_match: true,
      reference_match: true,
      currency_match: true,
      merchant_match: true,
      date_match: true,
      comparison: {
        expected_amount: "45000.00",
        receipt_amount: "45000.00",
        received_amount: "45000.00",
        receipt_reference: "FT26081290382",
        transaction_reference: "FT26081290382",
      },
      timeline: [
        {
          title: "Payment link generated",
          timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
          state: "complete",
        },
        {
          title: "Customer submitted transfer receipt",
          timestamp: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
          state: "complete",
        },
        {
          title: "Interbank NIP clearance in progress",
          timestamp: new Date(Date.now() - 3600 * 1000 * 1.4).toISOString(),
          state: "current",
        },
      ],
    },
  },
  {
    id: "pay_demo_103",
    merchant_id: DEMO_USER_ID,
    customer_name: "Emeka Nwosu",
    customer_phone: "+2348045678901",
    amount: "60000.00",
    currency: "NGN",
    description: "Handmade Leather Derby Shoes",
    order_note: "Size 43 in Oxblood Brown",
    reference: "PRF-2026-EMEK-03",
    public_token: "tok_emek_39201",
    public_url: "/pay/tok_emek_39201",
    status: "MISMATCH",
    status_reason:
      "Receipt uploaded was for ₦50,000.00 instead of requested ₦60,000.00.",
    created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000 * 36).toISOString(),
    is_expired: false,
    receipt: {
      original_filename: "emeka_slip_50k.png",
      mime_type: "image/png",
      size_bytes: 290000,
      preview_url:
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
      amount: "50000.00",
      currency: "NGN",
      reference: "ZEN-NIP-992102",
      bank: "Zenith Bank",
      status_text: "Successful",
      sender_name: "EMEKA NWOSU",
      recipient_name: "TOLA FASHION",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 11).toISOString(),
      account_hint: "0123456789",
      confidence: 0.96,
      raw_text:
        "ZENITH E-RECEIPT\nAmount: NGN 50,000.00\nBeneficiary: TOLA FASHION\nSender: EMEKA NWOSU\nRef: ZEN-NIP-992102",
    },
    transaction: {
      provider: "WEMA_NIP",
      provider_reference: "ZEN-NIP-992102",
      payment_reference: "PRF-2026-EMEK-03",
      amount: "50000.00",
      currency: "NGN",
      status: "SUCCESS",
      sender_name: "Emeka Nwosu",
      recipient_account_hint: "0123456789",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 11).toISOString(),
    },
    verification: {
      payment_id: "pay_demo_103",
      status: "MISMATCH",
      reason_code: "AMOUNT_UNDERPAID",
      reason: "Amount discrepancy: expected ₦60,000.00 but received ₦50,000.00.",
      verified_at: new Date(Date.now() - 3600 * 1000 * 10.8).toISOString(),
      amount_match: false,
      reference_match: true,
      currency_match: true,
      merchant_match: true,
      date_match: true,
      comparison: {
        expected_amount: "60000.00",
        receipt_amount: "50000.00",
        received_amount: "50000.00",
        receipt_reference: "ZEN-NIP-992102",
        transaction_reference: "ZEN-NIP-992102",
      },
      timeline: [
        {
          title: "Payment link generated",
          timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
          state: "complete",
        },
        {
          title: "Receipt uploaded with partial amount",
          timestamp: new Date(Date.now() - 3600 * 1000 * 11).toISOString(),
          state: "complete",
        },
        {
          title: "Amount mismatch flagged by PayPruf",
          timestamp: new Date(Date.now() - 3600 * 1000 * 10.8).toISOString(),
          state: "error",
        },
      ],
    },
  },
  {
    id: "pay_demo_104",
    merchant_id: DEMO_USER_ID,
    customer_name: "Folake Adebayo",
    customer_phone: "+2348056789012",
    amount: "18500.00",
    currency: "NGN",
    description: "Casual Linen Shirt & Trousers",
    order_note: "Standard delivery to Lekki",
    reference: "PRF-2026-FOLA-04",
    public_token: "tok_fola_44901",
    public_url: "/pay/tok_fola_44901",
    status: "NOT_RECEIVED",
    status_reason:
      "Customer submitted receipt claim, but no matching credit found in merchant Wema records.",
    created_at: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
    expires_at: new Date(Date.now() + 3600 * 1000 * 10).toISOString(),
    is_expired: false,
    receipt: {
      original_filename: "receipt_unverified.pdf",
      mime_type: "application/pdf",
      size_bytes: 184000,
      preview_url: null,
      amount: "18500.00",
      currency: "NGN",
      reference: "UNCONFIRMED-9901",
      bank: "Other Bank",
      status_text: "Pending",
      sender_name: "FOLAKE ADEBAYO",
      recipient_name: "TOLA FASHION",
      transaction_date: new Date(Date.now() - 3600 * 1000 * 19).toISOString(),
      account_hint: "0123456789",
      confidence: 0.85,
      raw_text:
        "TRANSFER CLAIM\nAmount: NGN 18,500.00\nBeneficiary: TOLA FASHION",
    },
    transaction: null,
    verification: {
      payment_id: "pay_demo_104",
      status: "NOT_RECEIVED",
      reason_code: "NO_LEDGER_RECORD",
      reason:
        "No incoming bank transaction matching this reference or amount was found in the merchant ledger.",
      verified_at: new Date(Date.now() - 3600 * 1000 * 18.5).toISOString(),
      amount_match: false,
      reference_match: false,
      currency_match: true,
      merchant_match: true,
      date_match: false,
      comparison: {
        expected_amount: "18500.00",
        receipt_amount: "18500.00",
        received_amount: null,
        receipt_reference: "UNCONFIRMED-9901",
        transaction_reference: null,
      },
      timeline: [
        {
          title: "Payment link generated",
          timestamp: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
          state: "complete",
        },
        {
          title: "Receipt uploaded by customer",
          timestamp: new Date(Date.now() - 3600 * 1000 * 19).toISOString(),
          state: "complete",
        },
        {
          title: "Ledger check: No funds recorded",
          timestamp: new Date(Date.now() - 3600 * 1000 * 18.5).toISOString(),
          state: "error",
        },
      ],
    },
  },
];

// ==========================================
// LOCAL STORAGE DATABASE ADAPTER
// ==========================================

class LocalStorageDatabaseAdapter {
  constructor() {
    this.init();
  }

  init() {
    // Ensure Users collection initialized
    const existingUsers = this.getCollection(STORAGE_KEYS.USERS);
    if (!existingUsers || existingUsers.length === 0) {
      this.setCollection(STORAGE_KEYS.USERS, [DEFAULT_DEMO_USER]);
    } else {
      // Ensure demo user is always present in users collection
      const hasDemo = existingUsers.some((u) => u.id === DEMO_USER_ID);
      if (!hasDemo) {
        existingUsers.push(DEFAULT_DEMO_USER);
        this.setCollection(STORAGE_KEYS.USERS, existingUsers);
      }
    }

    // Ensure Payments collection initialized
    const existingPayments = this.getCollection(STORAGE_KEYS.PAYMENTS);
    if (!existingPayments || existingPayments.length === 0) {
      this.setCollection(STORAGE_KEYS.PAYMENTS, DEFAULT_DEMO_PAYMENTS);
    }

    // Ensure Fraud Reports collection initialized
    const existingReports = this.getCollection(STORAGE_KEYS.FRAUD_REPORTS);
    if (!existingReports || existingReports.length === 0) {
      this.setCollection(STORAGE_KEYS.FRAUD_REPORTS, DEFAULT_FRAUD_REPORTS);
    }

    // Ensure Merchants Directory initialized
    const existingDir = this.getCollection(STORAGE_KEYS.MERCHANTS_DIR);
    if (!existingDir || existingDir.length === 0) {
      this.setCollection(STORAGE_KEYS.MERCHANTS_DIR, DEFAULT_REGISTERED_MERCHANTS);
    }
  }

  getCollection(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn(`Error reading ${key} from storage:`, err);
      return [];
    }
  }

  setCollection(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error(`Error saving ${key} to storage:`, err);
    }
  }

  // ------------------------------------------
  // USERS REPOSITORY
  // ------------------------------------------

  async getUsers() {
    return this.getCollection(STORAGE_KEYS.USERS);
  }

  async findUserById(id) {
    const users = await this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async findUserByIdentifier(identifier) {
    const cleanId = String(identifier || "").trim().toLowerCase();
    const cleanDigits = String(identifier || "").replace(/\D/g, "");
    const users = await this.getUsers();

    return (
      users.find((u) => {
        const uEmail = (u.email || "").toLowerCase();
        const uPhone = (u.phone || "").replace(/\D/g, "");
        const uAccount = (u.wemaAccountNumber || "").replace(/\D/g, "");
        const uId = (u.id || "").toLowerCase();

        return (
          uEmail === cleanId ||
          (cleanDigits && uPhone === cleanDigits) ||
          (cleanDigits && uAccount === cleanDigits) ||
          uId === cleanId
        );
      }) || null
    );
  }

  async createUser(userData) {
    const users = await this.getUsers();
    const newUser = {
      id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: userData.fullName || "",
      email: userData.email || "",
      phone: userData.phone || "",
      wemaAccountNumber: userData.wemaAccountNumber || "",
      accountName: userData.accountName || userData.fullName || "",
      businessName: userData.businessName || userData.fullName || "",
      password: userData.password || "",
      merchantOnboardingCompleted: Boolean(userData.merchantOnboardingCompleted),
      createdAt: new Date().toISOString(),
    };

    users.unshift(newUser);
    this.setCollection(STORAGE_KEYS.USERS, users);

    // Also register in merchant directory if account number provided
    if (newUser.wemaAccountNumber) {
      await this.registerMerchantInDirectory({
        accountNumber: newUser.wemaAccountNumber,
        accountName: newUser.accountName || newUser.fullName,
        businessName: newUser.businessName || newUser.fullName,
        registered: true,
      });
    }

    return newUser;
  }

  async updateUser(id, updates) {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found.");

    const updatedUser = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users[index] = updatedUser;
    this.setCollection(STORAGE_KEYS.USERS, users);

    // Update active session if this is current user
    const currentSession = await this.getSessionUser();
    if (currentSession && currentSession.id === id) {
      await this.setSessionUser(updatedUser);
    }

    // Update merchant directory if account number provided
    if (updatedUser.wemaAccountNumber) {
      await this.registerMerchantInDirectory({
        accountNumber: updatedUser.wemaAccountNumber,
        accountName: updatedUser.accountName || updatedUser.fullName,
        businessName: updatedUser.businessName || updatedUser.fullName,
        registered: true,
      });
    }

    return updatedUser;
  }

  // ------------------------------------------
  // AUTH SESSION
  // ------------------------------------------

  async getSessionUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Re-verify against users table to get most recent state
      if (parsed?.id) {
        const fresh = await this.findUserById(parsed.id);
        return fresh || parsed;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async setSessionUser(user) {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch (err) {
      console.error("Error setting session user:", err);
    }
  }

  async clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  // ------------------------------------------
  // PAYMENTS REPOSITORY
  // ------------------------------------------

  async getPayments() {
    return this.getCollection(STORAGE_KEYS.PAYMENTS);
  }

  async getPaymentsByMerchantId(merchantId) {
    const all = await this.getPayments();
    if (!merchantId) return all;
    return all.filter((p) => p.merchant_id === merchantId);
  }

  async findPaymentById(id) {
    const all = await this.getPayments();
    return all.find((p) => p.id === id) || null;
  }

  async findPaymentByToken(token) {
    const all = await this.getPayments();
    return (
      all.find(
        (p) =>
          p.public_token === token ||
          p.id === token ||
          p.reference === token
      ) || null
    );
  }

  async createPayment(paymentData) {
    const all = await this.getPayments();
    const id = paymentData.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const token = paymentData.public_token || `tok_${Math.random().toString(36).slice(2, 10)}`;
    const reference =
      paymentData.reference ||
      `PRF-${new Date().getFullYear()}-${paymentData.customer_name.slice(0, 4).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

    const newPayment = {
      id,
      merchant_id: paymentData.merchant_id,
      customer_name: paymentData.customer_name,
      customer_phone: paymentData.customer_phone || null,
      amount: paymentData.amount,
      currency: paymentData.currency || "NGN",
      description: paymentData.description,
      order_note: paymentData.order_note || null,
      reference,
      public_token: token,
      public_url: `/pay/${token}`,
      status: paymentData.status || "PENDING",
      status_reason:
        paymentData.status_reason ||
        "Payment request created. Awaiting customer transfer & receipt upload.",
      created_at: new Date().toISOString(),
      expires_at:
        paymentData.expires_at ||
        new Date(Date.now() + (paymentData.expires_in_hours || 24) * 3600 * 1000).toISOString(),
      is_expired: false,
      receipt: paymentData.receipt || null,
      transaction: paymentData.transaction || null,
      verification: paymentData.verification || null,
    };

    all.unshift(newPayment);
    this.setCollection(STORAGE_KEYS.PAYMENTS, all);
    return newPayment;
  }

  async updatePayment(id, updates) {
    const all = await this.getPayments();
    const index = all.findIndex((p) => p.id === id || p.public_token === id);
    if (index === -1) throw new Error("Payment record not found.");

    const updated = {
      ...all[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    all[index] = updated;
    this.setCollection(STORAGE_KEYS.PAYMENTS, all);
    return updated;
  }

  // ------------------------------------------
  // FRAUD REPORTS REPOSITORY
  // ------------------------------------------

  async getFraudReports() {
    return this.getCollection(STORAGE_KEYS.FRAUD_REPORTS);
  }

  async findFraudReportsByAccount(accountNumber) {
    const cleanNumber = String(accountNumber || "").replace(/\D/g, "").slice(0, 10);
    const reports = await this.getFraudReports();
    return reports.filter((r) => r.accountNumber === cleanNumber);
  }

  async createOrUpdateFraudReport(reportInput) {
    const cleanNumber = String(reportInput.accountNumber || "").replace(/\D/g, "").slice(0, 10);
    if (!cleanNumber || cleanNumber.length < 10) {
      throw new Error("Invalid merchant account number provided.");
    }
    if (!reportInput.reason) {
      throw new Error("Please select a reason for reporting this account.");
    }

    const allReports = await this.getFraudReports();
    const existingIndex = allReports.findIndex((r) => r.accountNumber === cleanNumber);

    const newIncident = {
      date: new Date().toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
      reporter: reportInput.reporterName
        ? `Verified Customer (${reportInput.reporterName})`
        : "1 Verified Customer",
      summary: reportInput.reason,
      description: reportInput.details || reportInput.reason,
      paymentRef: reportInput.paymentRef || undefined,
    };

    if (existingIndex >= 0) {
      const existing = allReports[existingIndex];
      existing.incidents = [newIncident, ...(existing.incidents || [])];
      existing.reportersCount = (existing.reportersCount || 1) + 1;
      existing.reason = `Reported ${existing.incidents.length} times for ${reportInput.reason.toLowerCase()}`;
      existing.details = reportInput.details || existing.details;
      existing.date = newIncident.date;
      allReports[existingIndex] = existing;
    } else {
      const newRecord = {
        id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        accountNumber: cleanNumber,
        merchantName: reportInput.merchantName || "Merchant Account",
        reportedBy: newIncident.reporter,
        reportersCount: 1,
        date: newIncident.date,
        reason: `Reported 1 time for ${reportInput.reason.toLowerCase()}`,
        details: reportInput.details || reportInput.reason,
        incidents: [newIncident],
        createdAt: new Date().toISOString(),
      };
      allReports.unshift(newRecord);
    }

    this.setCollection(STORAGE_KEYS.FRAUD_REPORTS, allReports);
    return { success: true };
  }

  // ------------------------------------------
  // MERCHANTS DIRECTORY
  // ------------------------------------------

  async getMerchantsDirectory() {
    return this.getCollection(STORAGE_KEYS.MERCHANTS_DIR);
  }

  async registerMerchantInDirectory(merchant) {
    const dir = await this.getMerchantsDirectory();
    const cleanNumber = String(merchant.accountNumber || "").replace(/\D/g, "").slice(0, 10);
    const existingIndex = dir.findIndex((m) => m.accountNumber === cleanNumber);

    if (existingIndex >= 0) {
      dir[existingIndex] = { ...dir[existingIndex], ...merchant };
    } else {
      dir.push(merchant);
    }
    this.setCollection(STORAGE_KEYS.MERCHANTS_DIR, dir);
  }

  async lookupMerchantAccount(accountNumber) {
    const cleanNumber = String(accountNumber || "").replace(/\D/g, "").slice(0, 10);
    if (!cleanNumber || cleanNumber.length < 10) {
      throw new Error("Please enter a valid 10-digit account number.");
    }

    // 1. Check registered users table
    const users = await this.getUsers();
    const registeredUser = users.find((u) => u.wemaAccountNumber === cleanNumber);
    if (registeredUser) {
      return {
        accountNumber: cleanNumber,
        accountName: registeredUser.accountName || registeredUser.fullName,
        businessName: registeredUser.businessName || registeredUser.fullName,
        registered: true,
        bankName: "Wema Bank / ALAT",
      };
    }

    // 2. Check directory
    const dir = await this.getMerchantsDirectory();
    const matched = dir.find((m) => m.accountNumber === cleanNumber);
    if (matched) {
      return {
        accountNumber: cleanNumber,
        accountName: matched.accountName,
        businessName: matched.businessName,
        registered: true,
        bankName: "Wema Bank / ALAT",
      };
    }

    // 3. Fallback demo
    if (cleanNumber === "0123456789") {
      return {
        accountNumber: cleanNumber,
        accountName: "Tola Fashion Enterprise",
        businessName: "Tola Fashion",
        registered: true,
        bankName: "Wema Bank / ALAT",
      };
    }

    // 4. Unregistered
    return {
      accountNumber: cleanNumber,
      accountName: "Unregistered Commercial Account",
      businessName: "Unknown Merchant",
      registered: false,
      bankName: "Wema Bank",
    };
  }
}

// Database instance exported
export const db = new LocalStorageDatabaseAdapter();
