# PayPruf FastAPI Backend

Production-ready asynchronous REST API for the **PayPruf** platform, built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL** (with dual configuration for local PostgreSQL and Supabase cloud pooler), **Google Gemini Vision OCR**, and **Deterministic Bank Ledger Reconciliation**.

---

## Features

- **Multi-Identifier Authentication:** Merchants sign in with their 10-digit Wema account number, email address, or phone number + password with secure bcrypt hashing and JWT Bearer session tokens.
- **Dual PostgreSQL / Supabase Database Support:** Seamlessly connect to a local PostgreSQL instance or Supabase cloud pooler with auto-fallback to SQLite for local development.
- **8-Stage ML Receipt Intelligence Engine:**
  - Image and PDF preprocessing (contrast enhancement, unsharp mask, scaling via `Pillow` and `pypdfium2`).
  - Google Gemini Vision OCR (`gemini-2.0-flash`) with pure-Python / RapidOCR local fallback.
  - Deterministic regex field extraction for 12 financial fields (amount, NIP session reference, 25+ Nigerian banks, sender/beneficiary names, masked/unmasked 10-digit NUBAN accounts).
  - Multi-factor weighted confidence scoring (0.0 to 1.0) and human-readable quality warning generation.
- **Deterministic 5-Point Bank Ledger Reconciliation:** Cross-checks payment link records, extracted receipt claims, and Wema bank ledger records to output `CONFIRMED`, `PENDING`, `MISMATCH`, or `NOT_RECEIVED` statuses with full audit timelines.
- **Risk Intelligence & Fraud Reporting:** Crowd-sourced fraud incident registry and merchant directory lookup.
- **Automated Database Seeding:** Auto-populates demo merchant (`0123456789`), registered merchants, multi-incident fraud reports, and 4 scenario payments on startup.
- **100% Pytest Test Suite:** Comprehensive unit and integration test coverage.

---

## Required Keys & Credentials

To run the backend with all features enabled, configure the following variables in `.env`:

| Key / Variable | Required? | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Optional | `sqlite:///./data/paypruf.db` | PostgreSQL connection string. Supports **Local PostgreSQL** (`postgresql+psycopg2://postgres:postgres@localhost:5432/paypruf`) or **Supabase** (`postgresql+psycopg2://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`). Defaults to SQLite if omitted. |
| `JWT_SECRET` | Required (Prod) | `paypruf_secure_jwt_secret_key_2026_super_secret` | Secret key used to sign and verify JWT authentication Bearer tokens. Generate with `openssl rand -hex 32`. |
| `GEMINI_API_KEY` | Optional | *(Empty by default)* | Google Gemini API key used for primary Vision OCR receipt reading. Get key at [Google AI Studio](https://aistudio.google.com/). If omitted, the engine uses local RapidOCR & deterministic regex parsing. |
| `SUPABASE_URL` | Optional | `https://[ref].supabase.co` | Supabase project URL (if using Supabase Auth or Storage). |
| `SUPABASE_KEY` | Optional | `sbp_...` | Supabase Anon / Service Role public API key. |

---

## Directory Structure

```
fastapi-backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint, CORS, and lifespan handler
│   ├── core/
│   │   ├── config.py            # Pydantic Settings management
│   │   ├── database.py          # SQLAlchemy 2.0 session factory (PostgreSQL & SQLite)
│   │   └── security.py          # Password hashing (bcrypt) and JWT encode/decode
│   ├── models/
│   │   ├── user.py              # User & MerchantDirectory models
│   │   ├── payment.py           # Payment, Receipt, BankTransaction, Verification models
│   │   └── fraud_report.py      # FraudReport & FraudIncident models
│   ├── schemas/
│   │   ├── auth.py              # Login, Register, Onboarding, Token schemas
│   │   ├── payment.py           # PaymentCreate, PaymentResponse, DashboardResponse
│   │   ├── receipt.py           # ExtractedReceiptClaim, ReceiptResponse schemas
│   │   ├── verification.py      # VerificationResponse, Comparison, Timeline schemas
│   │   └── risk.py              # AccountLookup, RiskCheck, FraudReport schemas
│   ├── services/
│   │   ├── auth_service.py      # Multi-identifier login & session verification
│   │   ├── payment_service.py   # Payment generation & dashboard analytics
│   │   ├── ocr_service.py       # 8-stage ML Vision OCR & deterministic parser
│   │   ├── reconcile_service.py # 5-point bank ledger reconciliation matcher
│   │   ├── risk_service.py      # Risk intelligence registry and incident tracking
│   │   └── storage_service.py   # Local and cloud receipt file storage
│   ├── seed/
│   │   └── initial_data.py      # Auto-seeds demo user, directory, payments, and fraud reports
│   └── api/
│       ├── deps.py              # FastAPI dependencies (get_db, get_current_user)
│       └── v1/
│           ├── auth.py          # /api/v1/auth routes
│           ├── merchant.py      # /api/v1/merchant routes
│           ├── payments.py      # /api/v1/payments routes
│           ├── public.py        # /api/v1/public customer portal routes
│           ├── risk.py          # /api/v1/risk intelligence routes
│           └── assets.py        # /api/v1/assets media serving routes
├── fixtures/                    # Sample Nigerian banking transfer receipts
├── tests/                       # 100% passing Pytest suite
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_payments.py
│   ├── test_ocr_and_reconciliation.py
│   └── test_risk.py
├── requirements.txt
├── .env.example
├── .env
├── pytest.ini
└── README.md
```

---

## Installation & Setup

### 1. Create and Activate Virtual Environment

```bash
cd fastapi-backend
python3 -m venv .venv
source .venv/bin/activate  # macOS / Linux
# or: .venv\Scripts\activate  # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```
Edit `.env` to configure your PostgreSQL / Supabase connection string or Gemini API key.

---

## Running the Server

Start the development server with hot-reloading:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API Base:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## Running the Pytest Suite

Run all unit and integration tests with pytest:

```bash
pytest -v
```

All 17 tests across authentication, payment lifecycle, OCR receipt processing, bank ledger reconciliation, and risk intelligence will execute and pass.

---

## Default Demo Credentials

On startup, the backend automatically seeds the default demo account:

- **Wema Account Number:** `0123456789`
- **Email:** `tolafashion@example.com`
- **Phone:** `08012345678`
- **Password:** `demopassword123`
- **One-Click Demo Login Endpoint:** `POST /api/v1/auth/demo-login`
