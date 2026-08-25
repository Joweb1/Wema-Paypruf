# PayPruf — Technical Documentation

## 1. Overview

PayPruf is an AI-powered payment verification and reconciliation platform designed primarily for online merchants and small businesses.

The system allows a merchant to generate a payment request/link containing their payment details. A customer makes the transfer through their bank, uploads the resulting payment receipt to PayPruf, and PayPruf analyzes the receipt and reconciles the extracted transaction information against the merchant's bank transaction records.

The goal is to reduce:

- Fake payment receipts
- Payment disputes
- Manual receipt checking
- Repeated checking of bank accounts
- Uncertainty around pending transfers
- Poor payment reconciliation


PayPruf also provides a customer-facing fraud-reporting feature that can help users identify accounts with previous reports before transferring money.


---

## 2. Core System Flow

```
MERCHANT
                    │
                    ▼
          Creates Payment Request
                    │
                    ▼
          PayPruf generates Link
                    │
                    ▼
        Merchant sends Link to Customer
                    │
                    ▼
                 CUSTOMER
                    │
                    ▼
          Makes Bank Transfer
                    │
                    ▼
          Receives Bank Receipt
                    │
                    ▼
        Uploads Receipt to PayPruf
                    │
                    ▼
          ┌─────────────────────┐
          │   AI Receipt Engine  │
          └──────────┬──────────┘
                     │
              Extract transaction
                information
                     │
                     ▼
          Receipt Validation
                     │
                     ▼
          Bank Reconciliation API
                     │
          ┌──────────┴──────────┐
          │                     │
       MATCHED               NOT FOUND
          │                     │
          ▼                     ▼
     VERIFIED                PENDING
          │                     │
          └──────────┬──────────┘
                     ▼
              Merchant Dashboard
                     │
                     ▼
             Payment History
             & Reconciliation
```

---

## 3. Main Features

### 3.1 Payment Requests

Merchants can create payment requests containing:

- Expected amount
- Customer name
- Order/reference information
- Merchant account information


PayPruf generates a public payment link that can be shared with the customer.

The link allows the customer to view the merchant's payment details and upload their payment receipt after completing the transfer.


---

### 3.2 AI Receipt Intelligence

The customer uploads a bank transfer receipt.

The AI processing pipeline extracts information such as:

- Transaction amount
- Transaction ID/reference
- Sender information
- Beneficiary information
- Transaction date/time
- Bank/provider
- Transaction status


The extracted information is then passed to the verification layer.


---

## 4. AI Processing Architecture

PayPruf uses a multi-tier receipt-processing system.

### Tier 1 — Google Gemini

Primary receipt intelligence is provided through Gemini multimodal models.

The AI analyzes the uploaded receipt and extracts structured transaction information.

Example:

```json
{
  "transaction_id": "TXN123456",
  "amount": 50000,
  "sender_name": "John Doe",
  "beneficiary_name": "Tola Fashion",
  "transaction_status": "successful",
  "bank": "Wema Bank"
}
```

### Tier 2 — NVIDIA Vision AI

If the primary AI service is unavailable, the system can fall back to NVIDIA's vision models.

### Tier 3 — Local OCR

A local OCR pipeline can provide a fallback mechanism for extracting text from receipts.

Regex and deterministic parsing can then identify transaction fields.

This architecture improves resilience during demonstrations and reduces dependence on a single AI provider.


---

## 5. Receipt Verification

PayPruf does not rely exclusively on the appearance of a receipt.

The extracted transaction information is reconciled against the merchant's bank transaction data.

For example:

**Receipt says:**
- Amount: ₦50,000
- Beneficiary: Tola Fashion
- Transaction ID: TX12345

                ↓

**Bank Transaction Records**

- Transaction ID: TX12345
- Amount: ₦50,000
- Beneficiary: Tola Fashion
- Status: SUCCESSFUL

                ↓

**RESULT**

✓ Payment Verified

If the receipt contains information that cannot be reconciled with the merchant's transaction records, PayPruf can return a pending/unverified result.


---

## 6. Dual-Criteria Verification

The verification process considers important transaction fields, particularly:

1. **Transaction amount**
2. **Beneficiary/merchant information**

Additional transaction identifiers can be used when available.

A payment should not be considered fully verified simply because an uploaded receipt looks legitimate. The transaction must also be consistent with the merchant's actual transaction records.


---

## 7. Payment States

PayPruf supports clear payment states.

**Verified**
- The receipt is valid and the corresponding transaction has been found in the merchant's account.

**Pending**
- The receipt appears valid, but the corresponding transaction has not yet appeared in the merchant's account.

**Failed / Unverified**
- The receipt or transaction cannot be successfully verified.
- The system should provide a meaningful reason instead of simply displaying: "Verification failed."


**Possible reasons include:**
- Invalid receipt
- Amount mismatch
- Beneficiary mismatch
- Transaction not found
- Transaction pending
- Unsupported bank
- Bank API unavailable
- Network/service error


---

## 8. Bank Reconciliation

For the hackathon prototype, PayPruf uses a sandbox/mock banking API representing the Wema Bank environment.

The reconciliation process is:

```
Receipt
   ↓
AI Extraction
   ↓
Transaction ID / Amount / Beneficiary
   ↓
Bank API
   ↓
Search Merchant Transactions
   ↓
Compare Transaction
   ↓
Verification Result
```

The architecture should allow additional banking integrations in the future.


---

## 9. Merchant Dashboard

The dashboard provides merchants with a centralized view of incoming payments.

**Important dashboard information includes:**

- Payments received today
- Verified payments
- Pending payments
- Unverified payments
- Total transaction value
- Recent transactions
- Customer/payment information


**Example:**

```
Today's Payments

₦250,000 received

✓ 8 Verified
⏳ 2 Pending
⚠ 1 Unverified
```


---

## 10. Payment History

Each payment record can contain:

- Customer
- Amount
- Transaction ID
- Date
- Status
- Verification result
- Receipt information

This gives merchants a simple reconciliation history rather than forcing them to manually compare receipts against their bank application.


---

## 11. Customer Fraud Reporting

PayPruf also contains a customer protection feature.

Before transferring money to an unfamiliar account, a user can check whether the account has previous fraud reports.

The system does not claim:
> "This account is definitely safe."

Instead, it provides information such as:

```
Account: 0123456789

Risk Information

✓ No previous reports found

or:

⚠ Reports found

3 users have reported this account.

Common report:
Payment made but goods/services were not delivered.
```

This is intended as an information/risk-awareness layer rather than a guarantee of safety.


---

## 12. Fraud Reports

Users can submit reports when they believe they have been defrauded.

A report can contain:

- Account number
- Merchant/account name
- Payment reference
- Amount
- Description of the issue
- Supporting payment information


Future versions can use accumulated reports to calculate risk indicators.


---

## 13. Accessibility

PayPruf includes an accessibility-focused screen-reader experience to demonstrate how financial applications can be made more usable for visually impaired users.

The interface should use:

- Semantic HTML
- Accessible labels
- Keyboard navigation
- Clear status messages
- Screen-reader-friendly controls
- Sufficient contrast
- Descriptive buttons and form fields


The accessibility layer is complementary to the core PayPruf payment-verification product.


---

## 14. Project Architecture

```
paypruf/
│
├── frontend/
│   ├── React application
│   ├── Components
│   ├── Pages
│   ├── Services
│   └── State management
│
├── fastapi-backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── ai/
│   │   └── database/
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── .env
│
├── docs/
│   └── API contracts and architecture notes
│
├── .env.example
└── README.md
```


---

## 15. Backend Architecture

The backend is built with FastAPI.

Its responsibilities include:

- Authentication
- Merchant management
- Payment request creation
- Payment link generation
- Receipt processing
- AI integration
- Transaction reconciliation
- Payment status management
- Fraud reports
- Dashboard statistics
- API communication


Conceptually:

```
React Frontend
       │
       ▼
   FastAPI API
       │
 ┌─────┼───────────────┐
 ▼     ▼               ▼
AI   Database       Bank API
 │      │               │
 ▼      ▼               ▼
Receipt Payments     Transactions
Analysis
```


---

## 16. Backend API Categories

The backend can expose endpoints for:

**Authentication**
- `POST /auth/register`
- `POST /auth/login`

**Payment Requests**
- `POST /payments/requests`
- `GET  /payments/requests`
- `GET  /payments/requests/{id}`

**Receipt Verification**
- `POST /receipts/verify`
- `GET  /receipts/{id}`

**Transactions**
- `GET /transactions`
- `GET /transactions/{id}`

**Dashboard**
- `GET /dashboard/summary`
- `GET /dashboard/recent`

**Fraud Reports**
- `POST /fraud-reports`
- `GET  /fraud-reports/check/{account_number}`

The exact endpoint structure can evolve during development.


---

## 17. Database

The project uses PostgreSQL for persistent application data.

**Core entities include:**

- Users
- Merchants
- Payment Requests
- Payment Records
- Receipt Verification Results
- Fraud Reports
- Transactions

**A simplified relationship:**

```
User
 │
 └── Merchant
       │
       ├── Payment Requests
       │
       ├── Payments
       │
       └── Fraud Reports
```


---

## 18. Environment Configuration

Sensitive configuration should be stored in environment variables rather than committed to GitHub.

**Important variables include:**

```env
DATABASE_URL=
JWT_SECRET=

GEMINI_API_KEY=
GEMINI_BACKUP_KEYS=

GEMINI_MODEL=

NVIDIA_API_KEY=
NVIDIA_MODEL=

UPLOAD_DIR=
```

`.env` should never be committed to the repository. Only `.env.example` should be committed.


---

## 19. Local Development

### Backend

```bash
cd fastapi-backend

python3 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI documentation:
- http://localhost:8000/docs


### Frontend

```bash
cd frontend

npm install

npm run dev
```


---

## 20. Testing

Backend tests are located inside:

`fastapi-backend/tests/`

Tests can be executed with:

```bash
PYTHONPATH=. .venv/bin/python -m pytest -v
```

The current project includes unit/integration coverage for the backend verification workflow.


---

## 21. Technical Design Principles

PayPruf follows several important principles:

**Verification over appearance**
- A receipt looking legitimate is not enough.

**Bank records as the source of truth**
- Where available, actual transaction records are used to reconcile receipt claims.

**Clear payment states**
- Users should understand whether a transaction is verified, pending, or unverified.

**Explainable failures**
- The application should tell users why verification failed.

**AI-assisted, deterministic verification**
- AI is used for receipt understanding and extraction, while transaction reconciliation uses deterministic matching against financial records.

**Extensible architecture**
- The banking integration should be replaceable so additional financial institutions can be supported later.


---

## 22. Hackathon Prototype Architecture

For the Hackaholics prototype, the banking layer is represented using a sandbox/mock transaction API rather than relying on production banking credentials.

The demo therefore simulates the complete workflow:

```
Merchant
   │
   ▼
Generate Payment Link
   │
   ▼
Customer Makes Payment
   │
   ▼
Upload Receipt
   │
   ▼
Gemini Receipt Analysis
   │
   ▼
Extract Transaction Data
   │
   ▼
Mock Wema Transaction API
   │
   ▼
Reconciliation
   │
   ├──────────────┐
   ▼              ▼
VERIFIED       PENDING
   │              │
   └──────┬───────┘
          ▼
    Merchant Dashboard
```

This allows the judges to see the complete product workflow without requiring access to production banking infrastructure.


---

## 23. Demo Account

The prototype can seed a demo merchant account:

- **Account Number:** 0123456789
- **Email:** tolafashion@example.com
- **Phone:** 08012345678
- **Password:** demopassword123

The application may also provide a one-click demo login.

**Important:** These credentials are for demonstration only and must never represent a real banking account.


---

## 24. Future Expansion

Potential future integrations include:

- Additional Nigerian banks
- Open banking providers
- Automated transaction monitoring
- More advanced fraud detection
- Merchant analytics
- Payment notifications
- WhatsApp integration
- Automated dispute workflows
- Mobile applications
- International payment providers


The core architecture is designed around the idea that the receipt-analysis and reconciliation layers can remain largely consistent while the banking integration layer changes.


---

[End of Technical README]