# PayPruf

PayPruf helps online merchants verify whether customer payments were actually received in their Wema account. It combines OCR receipt extraction, deterministic bank-transaction matching, and a React dashboard to reduce fake-payment disputes.

## What it does

- **Payment requests** — merchants create payment requests with amount, customer name, and optional order notes.
- **Public payment links** — customers receive a link to submit payment proof and upload a receipt.
- **OCR extraction** — the ML module extracts amount, reference, bank, sender, recipient, date, and status text from receipt images and PDFs.
- **Verification** — the backend matches receipt data against Wema bank transactions using a deterministic contract: exact reference lookup, bounded time window, amount/currency/merchant checks, and anti-reuse rules.
- **Merchant dashboard** — merchants track payments, view verifications, inspect extracted receipt data, and monitor risk.

## Project structure

```
.
├── frontend/          # React + Vite + Tailwind CSS client
├── backend/           # Flask API and FastAPI service
├── ml/                # Receipt OCR extraction and validation
├── docs/              # API contract and integration notes
├── .env.example       # Shared environment template
└── README.md
```

### Frontend (`frontend/`)

- React 19 with Vite 6 and Tailwind CSS 4
- React Router for public and merchant routes
- React Query for server state
- Pages: landing, login, register, merchant onboarding, dashboard, payment details, customer payment, verification, receipt upload by account, risk check

### Backend (`backend/`)

Two service implementations are present:

- **Flask service** (`run.py`) — blueprint-based routes for auth, payments, payment links, dashboard, risk, and fraud reports.
- **FastAPI service** (`app/main.py`) — router-based API with lifespan management, CORS middleware, structured logging, request ID tracking, and unified error envelopes.

Shared backend concerns:
- SQLAlchemy ORM with SQLite
- Firebase Auth and Firestore integration
- Wema bank provider with mock mode for local development
- Receipt uploads with configurable size limits
- Seed/demo data for local testing

### ML (`ml/`)

- Receipt OCR using RapidOCR and ONNX Runtime
- PDF and image preprocessing with pypdfium2 and Pillow
- Extraction pipeline: preprocessing → OCR → field extraction → normalization → validation
- Fixtures and demo receipts for offline development

### Docs (`docs/`)

- `API_CONTRACT.md` — shared source of truth for request/response shapes, status values, error envelopes, and the deterministic matching contract used by the frontend, backend, and ML module.

## Prerequisites

- **Node.js** 18+ and npm (for the frontend)
- **Python** 3.10+ (for backend and ML)
- **Git** (to clone the repository)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/Joweb1/Wema-Paypruf.git
cd Wema-Paypruf
```

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### 4. ML

```bash
cd ml
pip install -r requirements.txt
```

## Environment variables

Copy `.env.example` into the relevant places and update the values.

```env
# PayPruf backend
APP_ENV=development
DATABASE_URL=sqlite:///./backend/data/paypruf.db
FRONTEND_URL=http://localhost:5173
PUBLIC_APP_URL=http://localhost:5173
UPLOAD_DIR=./backend/data/uploads
MAX_UPLOAD_SIZE_BYTES=8388608
OCR_PROVIDER=rapidocr
WEMA_PROVIDER_MODE=mock
LOG_LEVEL=INFO

# PayPruf frontend (place this value in frontend/.env when overriding the dev proxy)
VITE_API_BASE_URL=/api

# Firebase (optional for local mock mode)
GOOGLE_APPLICATION_CREDENTIALS=
GCP_PROJECT=
FIREBASE_STORAGE_BUCKET=

# No Wema URL or API key is required in mock mode. Add real sandbox settings only
# after Wema supplies documented endpoints and credentials.
```

## Running locally

### Frontend

```bash
cd frontend
npm run dev
```

The frontend starts on `http://localhost:5173`.

### Backend (Flask)

```bash
cd backend
python run.py
```

### Backend (FastAPI)

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

### ML module

The ML module is consumed by the backend via the extraction service. It does not need a separate server for local development.

## Key conventions

- **API prefix:** `/api`
- **IDs:** UUID strings
- **Time:** ISO-8601 UTC timestamps
- **Money:** decimal strings with two fractional digits, e.g. `"25000.00"`
- **Currency:** ISO code; MVP supports `NGN`
- **Public payment statuses:** `PENDING | CONFIRMED | MISMATCH | NOT_RECEIVED`
- **Workflow stages:** `AWAITING_RECEIPT | READY_TO_VERIFY | VERIFYING | BANK_PENDING | COMPLETE | ERROR`
- **Uploaded files:** `multipart/form-data`, field name `file`, max 8 MiB by default

## Verification contract summary

1. Normalize money, currency, references, names, account hints, and dates.
2. Scope lookup to the request's merchant/account and a bounded time window.
3. Locate a candidate by exact normalized receipt/provider reference. If absent, the mock may use an exact `PaymentRequest.reference == MerchantTransaction.payment_reference` narration link. Never discover a candidate by amount alone.
4. No candidate returns `NOT_RECEIVED`.
5. A linked `PENDING` provider transaction returns `PENDING/BANK_PENDING`.
6. `FAILED` or `REVERSED` returns `NOT_RECEIVED` with a factual reason.
7. A successful candidate with a material amount, currency, reference, or merchant contradiction returns `MISMATCH`.
8. A successful, uniquely identified candidate whose expected amount/currency match and whose receipt does not materially contradict it returns `CONFIRMED`.
9. One merchant transaction cannot confirm two payment requests. Reuse returns `MISMATCH/TRANSACTION_ALREADY_USED`; rechecking the same payment remains idempotent.
10. Missing OCR fields reduce confidence and explanation detail; they never create proof or independently confirm payment.

Required demo bank references: `PAYPRUF-DEMO-001` (confirmed), `002` (amount mismatch), `003` (not received), `004` (provider pending).

## Tech stack

| Layer        | Tools |
|--------------|-------|
| Frontend     | React, Vite, Tailwind CSS, React Router, React Query |
| Backend      | Flask / FastAPI, SQLAlchemy, PyJWT, bcrypt, Pillow, RapidOCR |
| ML / OCR     | RapidOCR, ONNX Runtime, pypdfium2 |
| Auth / Infra | Firebase Auth, Firestore, Storage |
| Testing      | pytest, pytest-asyncio, pytest-cov |

## License

Proprietary — Wema PayPruf
