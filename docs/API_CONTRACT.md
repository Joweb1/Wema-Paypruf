# PayPruf API contract

This contract is the shared source of truth for the React client, FastAPI
application, receipt intelligence module, and deterministic Wema mock. The
planning PDF uses the legacy name PayBridge; all public product copy is PayPruf.

## Conventions

- API prefix: `/api`
- IDs: UUID strings
- Time: ISO-8601 UTC timestamps
- Money: decimal strings with two fractional digits, for example `"25000.00"`
- Currency: ISO code; the MVP supports `NGN`
- Public payment status: `PENDING | CONFIRMED | MISMATCH | NOT_RECEIVED`
- Workflow stage: `AWAITING_RECEIPT | READY_TO_VERIFY | VERIFYING | BANK_PENDING | COMPLETE | ERROR`
- Provider status: `SUCCESS | PENDING | FAILED | REVERSED`
- Uploaded files: `multipart/form-data`, field name `file`, maximum 8 MiB by default
- Public customer mutations are authorized by the unguessable payment token.
- This is a single-demo-merchant MVP; merchant authentication is out of scope.

`PENDING` is deliberately paired with `stage` and `status_reason`. A new request
is `PENDING/AWAITING_RECEIPT`; a located but unsettled bank transaction is
`PENDING/BANK_PENDING`.

## Error envelope

All application errors use the same shape:

```json
{
  "error": {
    "code": "PAYMENT_NOT_FOUND",
    "message": "The requested payment could not be found.",
    "details": null
  }
}
```

Validation errors use `VALIDATION_ERROR` and place safe field information in
`details`. Stack traces and secrets are never returned.

## Core resources

### Payment summary

```json
{
  "id": "uuid",
  "customer_name": "Chinedu Okafor",
  "customer_phone": "+2348000000000",
  "amount": "25000.00",
  "currency": "NGN",
  "description": "Order payment",
  "order_note": "Blue kaftan",
  "reference": "PRUF-X82K9A",
  "public_token": "merchant-responses-only",
  "public_url": "http://localhost:5173/pay/token",
  "status": "PENDING",
  "stage": "AWAITING_RECEIPT",
  "status_reason": "Waiting for a receipt to be uploaded.",
  "expires_at": "2026-08-20T18:00:00Z",
  "is_expired": false,
  "created_at": "2026-08-19T18:00:00Z",
  "updated_at": "2026-08-19T18:00:00Z"
}
```

The public-token representation omits `customer_phone` and `public_token`.

### Receipt

```json
{
  "id": "uuid",
  "original_filename": "receipt.png",
  "mime_type": "image/png",
  "size_bytes": 12345,
  "amount": "25000.00",
  "currency": "NGN",
  "reference": "PAYPRUF-DEMO-001",
  "bank": "Demo Bank",
  "transaction_date": "2026-08-19",
  "transaction_time": "17:42:00",
  "sender_name": "Chinedu Okafor",
  "recipient_name": "Tola Fashion",
  "status_text": "Successful",
  "account_hint": "ending 6789",
  "confidence": 0.94,
  "raw_text": "merchant-only detail response",
  "created_at": "2026-08-19T18:01:00Z",
  "extracted_at": "2026-08-19T18:01:02Z",
  "preview_url": "/api/payments/payment-uuid/receipt/file"
}
```

### Merchant transaction

`payment_reference` is the PayPruf request/narration linkage and is distinct
from `provider_reference`, the bank transaction ID extracted from a receipt.

```json
{
  "id": "uuid",
  "provider": "WEMA_MOCK",
  "provider_reference": "PAYPRUF-DEMO-001",
  "payment_reference": null,
  "amount": "25000.00",
  "currency": "NGN",
  "sender_name": "Chinedu Okafor",
  "recipient_account_hint": "ending 6789",
  "status": "SUCCESS",
  "transaction_date": "2026-08-19T17:40:00Z"
}
```

### Verification

```json
{
  "id": "uuid",
  "payment_id": "uuid",
  "status": "CONFIRMED",
  "reason_code": "MATCH_CONFIRMED",
  "reason": "PayPruf found a matching successful merchant-side transaction.",
  "amount_match": true,
  "reference_match": true,
  "currency_match": true,
  "merchant_match": true,
  "date_match": true,
  "verified_at": "2026-08-19T18:01:03Z",
  "receipt": {},
  "transaction": {},
  "comparison": {
    "expected_amount": "25000.00",
    "receipt_amount": "25000.00",
    "received_amount": "25000.00",
    "receipt_reference": "PAYPRUF-DEMO-001",
    "transaction_reference": "PAYPRUF-DEMO-001"
  },
  "timeline": [
    {"key": "created", "label": "Payment request created", "timestamp": "...", "state": "COMPLETE"},
    {"key": "opened", "label": "Customer opened PayPruf link", "timestamp": "...", "state": "COMPLETE"},
    {"key": "uploaded", "label": "Receipt uploaded", "timestamp": "...", "state": "COMPLETE"},
    {"key": "extracted", "label": "Receipt extracted", "timestamp": "...", "state": "COMPLETE"},
    {"key": "checked", "label": "Merchant transaction checked", "timestamp": "...", "state": "COMPLETE"},
    {"key": "verified", "label": "Verification completed", "timestamp": "...", "state": "COMPLETE"}
  ]
}
```

## Routes

### Health and merchant dashboard

- `GET /api/health`
  - `{ "status": "ok", "database": "ok", "wema_provider": "mock", "ocr_provider": "rapidocr" }`
- `GET /api/dashboard/summary`
  - exact response shape:

    ```json
    {
      "merchant": {},
      "total": {"count": 4, "value": "95000.00"},
      "confirmed": {"count": 1, "value": "25000.00"},
      "pending": {"count": 1, "value": "30000.00"},
      "mismatch": {"count": 1, "value": "25000.00"},
      "not_received": {"count": 1, "value": "15000.00"},
      "recent_payments": []
    }
    ```

### Merchant payment routes

- `POST /api/payments`
  - body: `customer_name`, optional `customer_phone`, `amount`, `description`, optional `order_note`, optional `expires_in_hours` (default 24)
  - returns `201` with the payment summary
- `GET /api/payments?status=&search=&limit=&offset=`
  - returns `{ "items": [], "total": 0 }`
- `GET /api/payments/{payment_id}`
  - returns `{ "payment": {}, "merchant": {}, "receipt": null,
    "verification": null, "transaction": null, "timeline": [] }`
- `POST /api/payments/{payment_id}/receipt`
  - merchant/demo alias for upload; returns `{ "payment": {}, "receipt": {} }`
- `POST /api/payments/{payment_id}/verify`
  - idempotently creates or updates the current verification
- `POST /api/payments/{payment_id}/recheck`
  - same matching operation with current receipt and refreshed provider data
- `GET /api/payments/{payment_id}/verification`
- `GET /api/payments/{payment_id}/receipt/file`
  - safe inline preview of the current receipt

### Public token routes

- `GET /api/public/payments/{token}`
  - returns `{ "payment": {}, "merchant": {}, "payment_instructions": {},
    "receipt": null, "verification": null }`; records first open
  - when present, `verification` uses the full verification shape so the public
    result page remains complete after refresh; the embedded receipt omits raw
    OCR text and the embedded transaction never exposes raw provider payloads or
    full account data
- `POST /api/public/payments/{token}/receipt`
- `POST /api/public/payments/{token}/verify`
- `POST /api/public/payments/{token}/recheck`
- `GET /api/public/payments/{token}/receipt/file`

Expired payment tokens return `410 PAYMENT_EXPIRED` for new upload/verify actions.

## Deterministic matching contract

1. Normalize money, currency, references, names, account hints, and dates.
2. Scope all lookup to the request's merchant/account and a bounded time window.
3. Locate a candidate by exact normalized receipt/provider reference. If absent,
   the mock may use an exact `PaymentRequest.reference ==
   MerchantTransaction.payment_reference` narration link. Never discover a
   candidate by amount alone.
4. No candidate returns `NOT_RECEIVED`.
5. A linked `PENDING` provider transaction returns `PENDING/BANK_PENDING`.
6. `FAILED` or `REVERSED` returns `NOT_RECEIVED` with a factual reason.
7. A successful candidate with a material amount, currency, reference, or
   merchant contradiction returns `MISMATCH`.
8. A successful, uniquely identified candidate whose expected amount/currency
   match and whose receipt does not materially contradict it returns
   `CONFIRMED`.
9. One merchant transaction cannot confirm two payment requests. Reuse returns
   `MISMATCH/TRANSACTION_ALREADY_USED`; rechecking the same payment remains
   idempotent.
10. Missing OCR fields reduce confidence and explanation detail; they never
    create proof or independently confirm payment.

The required demo bank references are `PAYPRUF-DEMO-001` (confirmed), `002`
(received amount 20,000 versus expected/receipt 25,000), `003` (no merchant
transaction), and `004` (provider pending at 30,000).
