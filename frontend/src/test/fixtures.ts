import type { PaymentSummary } from "../types/api";

export const pendingPayment: PaymentSummary = {
  id: "4f4e8132-0a5e-4f34-88b4-fd5a309b96eb",
  customer_name: "Chinedu Okafor",
  customer_phone: "+2348000000000",
  amount: "25000.00",
  currency: "NGN",
  description: "Order payment",
  order_note: "Blue kaftan",
  reference: "PRUF-X82K9A",
  public_token: "public-demo-token",
  public_url: "http://localhost:5173/pay/public-demo-token",
  status: "PENDING",
  stage: "AWAITING_RECEIPT",
  status_reason: "Waiting for a receipt to be uploaded.",
  expires_at: "2026-08-20T18:00:00Z",
  is_expired: false,
  created_at: "2026-08-19T18:00:00Z",
  updated_at: "2026-08-19T18:00:00Z",
};
