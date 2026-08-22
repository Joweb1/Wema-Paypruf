# PayPruf — AI-Powered Payment Receipt Intelligence & Bank Ledger Reconciliation

PayPruf helps online merchants eliminate fake-payment disputes and verify customer bank transfers with 99.9% precision. It combines **Google Gemini 3.5 Multimodal Vision AI**, **NVIDIA Cloud Vision AI Backup**, **Local Fallback OCR**, and **Deterministic Wema Bank Ledger Reconciliation** with a React dashboard.

---

## What It Does

- **Payment Requests & Custom Links:** Merchants generate payment links with expected amounts, customer names, and order descriptions.
- **AI Receipt Intelligence & Multi-Tier Failover:**
  - **Tier 1 (Primary):** Google Gemini 3.5 Vision AI (`gemini-3.5-flash`, `gemini-flash-lite`) with multi-key failover pool.
  - **Tier 2 (Secondary Backup):** NVIDIA Cloud Vision AI (`meta/llama-3.2-11b-vision-instruct` / `nvidia/nemotron`).
  - **Tier 3 (Offline Fallback):** In-process Local RapidOCR and deterministic regex extraction.
- **Dual-Criteria Verification:** Strictly matches both **Transfer Amount** and **Beneficiary/Merchant Name** against registered account details.
- **AI Forensics & Tampering Detection:** Calculates originality ratings (0–100%) and detects altered typography, fonts, and synthetic slips.
- **Direct Public Receipt Upload:** Visitors can upload a transfer slip directly to verify against any merchant account (`/receipt-upload/:accountName`).
- **Interactive AI Key Monitor:** Live execution trace modal with a real-time key ping & diagnostics test suite in the UI.

---

## Project Structure

```
.
├── frontend/          # React 19 + Vite 6 + Tailwind CSS client
├── fastapi-backend/   # High-performance FastAPI REST backend with ML OCR & PostgreSQL/Supabase
├── docs/              # API contracts and architecture notes
├── .env.example       # Shared environment configuration template
└── README.md
```

---

## Prerequisites

- **Node.js:** v18.0.0 or higher
- **Python:** v3.10 or higher
- **Git:** for version control

---

## Getting Started (Quick Setup)

### 1. Set Up and Start the FastAPI Backend

Open a terminal and run:

```bash
# Navigate to the backend directory
cd fastapi-backend

# Create a Python virtual environment (if not already created)
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install required Python packages
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Start the development server with live-reloading
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Backend Access Points:**
> - **API Base URL:** [http://localhost:8000](http://localhost:8000)
> - **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
> - **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
> - **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Set Up and Start the React Frontend

Open a second terminal and run:

```bash
# Navigate to the frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```

> **Frontend Access Point:**
> - **Web Application:** [http://localhost:5173](http://localhost:5173) (or `http://localhost:3000`)

---

## Running in the Background (Persistent Mode)

If you prefer to run both backend and frontend in the background:

```bash
# Start backend in background
cd fastapi-backend
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &

# Start frontend in background
cd ../frontend
nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
```

---

## Running Backend Tests

Run all unit and integration tests (17 passing tests):

```bash
cd fastapi-backend
PYTHONPATH=. .venv/bin/python -m pytest -v
```

---

## Environment Variables (`fastapi-backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL (Local/Supabase) or SQLite database URI | `sqlite:///./data/paypruf.db` |
| `JWT_SECRET` | Secret key for signing authentication Bearer tokens | `paypruf_secure_jwt_secret_key_2026_super_secret` |
| `GEMINI_API_KEY` | Primary Google Gemini API key | `your_gemini_api_key_here` |
| `GEMINI_BACKUP_KEYS` | Comma-separated backup Gemini API keys for failover | `backup_key_1,backup_key_2` |
| `GEMINI_MODEL` | Preferred Gemini vision model | `gemini-3.5-flash` |
| `NVIDIA_API_KEY` | NVIDIA Cloud NIM API key for secondary backup vision | `your_nvidia_api_key_here` |
| `NVIDIA_MODEL` | Preferred NVIDIA vision model | `meta/llama-3.2-11b-vision-instruct` |
| `UPLOAD_DIR` | Storage path for uploaded receipts | `./uploads/receipts` |

---

## Default Demo Credentials

The backend automatically seeds a demo merchant account on startup:

- **Wema Account Number:** `0123456789`
- **Email:** `tolafashion@example.com`
- **Phone:** `08012345678`
- **Password:** `demopassword123`
- **One-Click Login:** Available directly on the login page via the **"Demo Merchant"** button.

---

## License

Proprietary — Wema PayPruf Platform
