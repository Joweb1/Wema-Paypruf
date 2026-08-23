# PayPruf — AI-Powered Payment Verification & Reconciliation

## Team Members
- [Name 1]
- [Name 2]
- [Name 3]

---

## 🚀 Live Demo

- **Live Application:** [Add deployed application URL]
- **Backend API:** [Add live backend API URL]
- **Recorded Demo:** [Add Loom/demo video URL]

---

## 🎯 The Problem

### How might we make bank-transfer payments more trustworthy and easier to reconcile for both customers and merchants?

When a customer transfers money to an online merchant, the customer may see a successful transaction while the merchant may not yet see the money in their account. This creates uncertainty, repeated checking, fake or misleading receipt claims, and payment disputes.

Customers often have to rely on the merchant to confirm whether the money arrived, while merchants manually compare receipts with their bank transactions.

**PayPruf addresses this trust gap by creating a verification layer between the customer, payment receipt, and the merchant's bank transaction record.**

---

## ✨ Our Solution

**PayPruf is an AI-powered payment verification and reconciliation platform for online merchants and their customers.**

A merchant creates a payment request/link. After making the transfer through their normal banking app, the customer uploads the payment receipt to PayPruf.

PayPruf then:

1. Extracts transaction information from the receipt using AI.
2. Validates the information contained in the receipt.
3. Matches the payment against the merchant's available bank transaction records.
4. Tells the customer whether the merchant has actually received the payment.
5. Gives the merchant a dashboard showing verified, pending, unmatched, and other payment activity.
6. Helps merchants reconcile incoming payments without manually checking receipts one by one.

> **Don't just trust the receipt. Verify the payment.**

---

## 🔄 Core User Flow

```text
MERCHANT
   │
   ├── Creates payment request/link
   │
   ▼
CUSTOMER
   │
   ├── Opens PayPruf payment link
   ├── Views merchant/payment details
   ├── Makes transfer through their bank app
   └── Uploads payment receipt
            │
            ▼
       PAYPRUF AI
            │
            ├── Extract receipt data
            ├── Validate transaction details
            └── Match against merchant ledger
                     │
             ┌───────┴────────┐
             ▼                ▼
        VERIFIED           PENDING /
        PAYMENT            UNMATCHED
             │                │
             └───────┬────────┘
                     ▼
             MERCHANT DASHBOARD
                     │
                     ├── Payment status
                     ├── Customer details
                     ├── Transaction reference
                     └── Reconciliation history
```

---

## 💡 Key Features

### 1. AI Payment Receipt Verification

PayPruf uses AI to read and extract important transaction information from uploaded receipts, including:

- Amount
- Sender/recipient details
- Bank/provider
- Transaction reference
- Transaction date/time
- Payment status

The extracted information is then used as part of the verification process.

### 2. Payment Requests & Custom Links

Merchants can generate a PayPruf payment link containing their payment details and, when required, an expected payment amount.

Instead of repeatedly sending account details and asking customers to send receipts through social media, the merchant can share one PayPruf link.

### 3. Bank Ledger Reconciliation

PayPruf compares information extracted from the customer's receipt with the merchant's available bank transaction records.

This helps determine whether the payment has actually reached the merchant.

### 4. Merchant Dashboard

Merchants can see:

- Payments received
- Verified payments
- Pending/unmatched payments
- Payment amounts
- Customer/payment references
- Reconciliation activity
- Simple payment statistics

### 5. Customer Payment Confirmation

Customers receive a clear status explaining whether the merchant has received the money.

This reduces the need for customers to repeatedly ask:

> "Have you seen the money?"

### 6. Fraud & Account Risk Reports

PayPruf also provides a customer-protection feature.

Before transferring money to an unfamiliar merchant, a customer can check whether the account has previous reports associated with potentially fraudulent activity.

Customers can also report problematic transactions, such as paying for a product or service and not receiving what was promised.

Reports are treated as **risk signals, not automatic proof of fraud**. PayPruf does not guarantee that an account is safe or fraudulent.

### 7. Accessibility

The prototype includes accessibility-focused interactions and screen-reader support to demonstrate how financial services can be made easier to use for visually impaired customers.

---

## 🧠 Verification Logic

PayPruf does not treat an uploaded image as proof simply because it looks like a bank receipt.

```text
Receipt Upload
      ↓
AI Extraction
      ↓
Transaction Data Validation
      ↓
Expected Amount / Merchant Check
      ↓
Bank Transaction Lookup
      ↓
Transaction Matching
      ↓
Final Status
```

### Possible Outcomes

- ✅ **Verified** — receipt information matches a successful merchant-side transaction.
- 🟡 **Pending** — receipt appears valid, but the merchant-side transaction has not been confirmed yet.
- ❌ **Unverified** — required information could not be validated or the transaction could not be matched.
- ⚠️ **Mismatch** — important details such as amount, beneficiary, or transaction reference do not match.

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **Database/Backend Infrastructure:** Supabase
- **AI:** Google Gemini API
- **Bank Integration:** Wema Bank Sandbox/Mock API
- **Version Control:** Git + GitHub
- **Deployment:** [Add deployment platform]

FastAPI provides the application REST API, while PostgreSQL is the relational database used by the application. Supabase provides the hosted PostgreSQL infrastructure and supporting database services.

---

## 🏗️ Architecture

```text
┌──────────────────────────┐
│       React Frontend     │
│  Merchant + Customer UI  │
└────────────┬─────────────┘
             │ REST API
             ▼
┌──────────────────────────┐
│     FastAPI Backend      │
│                          │
│ Auth / Payments / Links  │
│ Verification / Reports   │
│ Reconciliation / API     │
└───────┬─────────┬────────┘
        │         │
        │         └──────────────────┐
        ▼                            ▼
┌───────────────┐          ┌─────────────────┐
│  PostgreSQL   │          │  Google Gemini  │
│   via         │          │ Receipt AI      │
│   Supabase    │          │ Extraction      │
└───────────────┘          └─────────────────┘
        │
        ▼
┌──────────────────────────┐
│ Wema Bank Sandbox / Mock │
│ Transaction Verification │
└──────────────────────────┘
```

---

## 📁 Project Structure

```text
paypruf/
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── integrations/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── ml/
│   ├── receipt/
│   └── prompts/
│
├── docs/
├── .env.example
└── README.md
```

---

## ⚙️ How to Set Up and Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git
- PostgreSQL/Supabase project
- Google Gemini API key
- Wema Bank sandbox/mock API credentials

### 1. Clone the repository

```bash
git clone [YOUR_REPOSITORY_URL]
cd paypruf
```

### 2. Start the FastAPI backend

```bash
cd backend

python -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=...
GEMINI_API_KEY=...
WEMA_API_BASE_URL=...
WEMA_API_KEY=...
JWT_SECRET=...
```

Run the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### 3. Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Security & Trust

PayPruf is a payment verification and reconciliation layer, not a replacement for a bank.

The hackathon prototype uses sandbox/mock transaction data and should not be interpreted as access to production banking systems.

Fraud reports are treated as risk signals rather than definitive legal or criminal determinations.

Sensitive API keys and credentials should be stored in environment variables and never committed to GitHub.

---

## 🌍 Future Vision

PayPruf starts with merchant-side payment verification and reconciliation but can expand beyond a single banking ecosystem.

Future possibilities include:

- Multi-bank transaction verification
- Automated payment reconciliation
- Payment reversal monitoring
- Merchant reputation/risk signals
- Advanced fraud detection
- Business financial analytics
- E-commerce integrations
- Payment-provider integrations
- More accessible banking experiences

The long-term vision is to make bank transfers **easier to verify, easier to reconcile, and safer to trust**.

---

## 🏆 Hackathon Context

PayPruf was developed for **Hackaholics 7.0** as a practical application of AI and banking infrastructure to a common financial problem: uncertainty around bank-transfer payments.

The project demonstrates how a verification layer can connect:

**Customer → Payment Receipt → AI Verification → Bank Ledger → Merchant**

instead of making either party rely solely on screenshots, receipts, or verbal confirmation.

---

## 📄 License

Proprietary — PayPruf Hackathon Project