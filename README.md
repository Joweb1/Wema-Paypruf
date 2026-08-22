# PayPruf

PayPruf helps online merchants verify whether customer payments were actually received in their Wema account. It combines OCR receipt extraction, deterministic bank-transaction matching, and a React dashboard to reduce fake-payment disputes.

## What it does

- **Payment requests** — merchants create payment requests with amount, customer name, and optional order notes.
- **Public payment links** — customers receive a link to submit payment proof and upload a receipt.
- **OCR extraction** — extracts amount, reference, bank, sender, recipient, date, and status text from receipt images and PDFs using Gemini Vision + deterministic regex parsing.
- **Verification** — matches receipt data against Wema bank transactions using a deterministic contract: exact reference lookup, bounded time window, amount/currency/merchant checks, and anti-reuse rules.
- **Merchant dashboard** — merchants track payments, view verifications, inspect extracted receipt data, and monitor risk.

## Project structure

```
.
├── frontend/          # React 19 + Vite 6 + Tailwind CSS client
├── fastapi-backend/   # High-performance FastAPI REST backend with ML OCR & PostgreSQL/Supabase
├── ml/                # Standalone receipt OCR extraction and validation
├── docs/              # API contract and integration notes
├── .env.example       # Shared environment template
└── README.md
```

### Frontend (`frontend/`)

- React 19 with Vite 6 and Tailwind CSS 4
- React Router for public and merchant routes
- React Query for server state
- Pages: landing, login, register, merchant onboarding, dashboard, payment details, customer payment, verification, receipt upload by account, risk check

### FastAPI Backend (`fastapi-backend/`)

- Built with **FastAPI**, **SQLAlchemy 2.0**, and **Pydantic**
- Dual PostgreSQL & Supabase support with SQLite fallback
- Multi-identifier authentication (Wema Account, Email, Phone) + JWT sessions
- Integrated 8-stage ML Receipt Intelligence Engine (Google Gemini Vision OCR + local RapidOCR/regex fallback)
- Deterministic 5-point Wema bank ledger reconciliation engine
- 100% test coverage with pytest

## Prerequisites

- **Node.js** 18+ and npm (for frontend)
- **Python** 3.10+ (for fastapi-backend)
- **Git** (to clone repository)

## Running the Application Locally

### 1. Start the FastAPI Backend

```bash
cd fastapi-backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Base: `http://localhost:8000`
- Interactive Swagger UI Docs: `http://localhost:8000/docs`
- Run Backend Tests: `pytest -v`

### 2. Start the React Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend App: `http://localhost:5173` (or `http://localhost:3000`)

---

## Required Keys & Credentials

| Key | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL or Supabase Connection String | `sqlite:///./data/paypruf.db` |
| `JWT_SECRET` | Secret key for signing authentication tokens | `paypruf_secure_jwt_secret_key_2026_super_secret` |
| `GEMINI_API_KEY` | Google Gemini API key for Vision OCR | *(Optional - pure-Python/RapidOCR used if omitted)* |

---

## Default Demo Credentials

- **Wema Account Number:** `0123456789`
- **Email:** `tolafashion@example.com`
- **Phone:** `08012345678`
- **Password:** `demopassword123`

---

## License

Proprietary — Wema PayPruf
