export const PAYMENT_STATUSES = ["PENDING", "CONFIRMED", "MISMATCH", "NOT_RECEIVED"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type WorkflowStage =
  | "AWAITING_RECEIPT"
  | "READY_TO_VERIFY"
  | "VERIFYING"
  | "BANK_PENDING"
  | "COMPLETE"
  | "ERROR";

export type ProviderStatus = "SUCCESS" | "PENDING" | "FAILED" | "REVERSED";
export type TimelineState = "COMPLETE" | "CURRENT" | "PENDING" | "ERROR";

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: unknown;
  };
}

export interface Merchant {
  id: string;
  business_name: string;
  display_name: string;
  phone?: string | null;
  wema_account_name: string;
  wema_account_number?: string;
  wema_account_number_hint?: string;
  bank_name?: string;
  created_at?: string;
}

export interface PaymentSummary {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  amount: string;
  currency: string;
  description: string;
  order_note?: string | null;
  reference: string;
  public_token?: string;
  public_url?: string;
  status: PaymentStatus;
  stage: WorkflowStage;
  status_reason: string;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface SummaryBucket {
  count: number;
  value: string;
}

export interface DashboardSummary {
  merchant: Merchant;
  total: SummaryBucket;
  confirmed: SummaryBucket;
  pending: SummaryBucket;
  mismatch: SummaryBucket;
  not_received: SummaryBucket;
  recent_payments: PaymentSummary[];
}

export interface Receipt {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  amount?: string | null;
  currency?: string | null;
  reference?: string | null;
  bank?: string | null;
  transaction_date?: string | null;
  transaction_time?: string | null;
  sender_name?: string | null;
  recipient_name?: string | null;
  status_text?: string | null;
  account_hint?: string | null;
  confidence: number;
  raw_text?: string;
  created_at: string;
  extracted_at?: string | null;
  preview_url?: string;
}

export interface MerchantTransaction {
  id: string;
  provider: string;
  provider_reference: string;
  payment_reference?: string | null;
  amount: string;
  currency: string;
  sender_name?: string | null;
  recipient_account_hint?: string | null;
  status: ProviderStatus;
  transaction_date: string;
}

export interface Comparison {
  expected_amount: string;
  receipt_amount?: string | null;
  received_amount?: string | null;
  receipt_reference?: string | null;
  transaction_reference?: string | null;
}

export interface TimelineEvent {
  key: string;
  label: string;
  timestamp?: string | null;
  state: TimelineState;
}

export interface Verification {
  id: string;
  payment_id: string;
  status: PaymentStatus;
  reason_code: string;
  reason: string;
  amount_match?: boolean | null;
  reference_match?: boolean | null;
  currency_match?: boolean | null;
  merchant_match?: boolean | null;
  date_match?: boolean | null;
  verified_at: string;
  receipt?: Receipt | null;
  transaction?: MerchantTransaction | null;
  comparison: Comparison;
  timeline: TimelineEvent[];
}

export interface PaymentDetail {
  payment: PaymentSummary;
  merchant: Merchant;
  receipt?: Receipt | null;
  verification?: Verification | null;
  transaction?: MerchantTransaction | null;
  timeline: TimelineEvent[];
}

export interface PaymentInstructions {
  bank_name: string;
  account_name: string;
  account_number: string;
  account_number_hint?: string;
  environment?: string;
}

export interface PublicPaymentDetail {
  payment: PaymentSummary;
  merchant: Merchant;
  payment_instructions: PaymentInstructions;
  receipt?: Receipt | null;
  verification?: Verification | null;
}

export interface CreatePaymentInput {
  customer_name: string;
  customer_phone?: string;
  amount: string;
  description: string;
  order_note?: string;
  expires_in_hours?: number;
}

export interface UploadReceiptResponse {
  payment: PaymentSummary;
  receipt: Receipt;
}

export interface PaymentListResponse {
  items: PaymentSummary[];
  total: number;
}

export type RegistrationMethod = "email" | "phone" | "wema";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  wemaAccountNumber: string | null;
  role: string;
  merchantOnboardingCompleted: boolean;
}

export interface MerchantProfile {
  id: string;
  userId: string;
  wemaAccountNumber: string;
  accountName: string;
  businessName: string | null;
  accountVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantMe {
  user: AuthUser;
  profile: MerchantProfile | null;
}

export interface RegisterPayload {
  fullName: string;
  method: RegistrationMethod;
  identifier: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface OnboardingPayload {
  wemaAccountNumber: string;
  accountName: string;
  businessName?: string;
}
