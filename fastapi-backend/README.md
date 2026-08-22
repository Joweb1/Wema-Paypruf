# PayPruf FastAPI Backend

Production-ready asynchronous REST API for the **PayPruf** platform, built with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL / Supabase**, **Multi-Tier Vision AI (Google Gemini 3.5 & NVIDIA NIM)**, and **Deterministic Bank Ledger Reconciliation**.

---

## Key Features

- **Multi-Identifier Authentication:** Merchants sign in with 10-digit Wema account number, email, or phone + password with bcrypt hashing and JWT Bearer session tokens.
- **Multi-Tier AI Receipt Extraction & Failover:**
  - **Tier 1:** Google Gemini Vision (`gemini-3.5-flash`, `gemini-flash-lite`) with multi-key failover pool.
  - **Tier 2:** NVIDIA Cloud Vision (`meta/llama-3.2-11b-vision-instruct`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`).
  - **Tier 3:** Local in-process RapidOCR + deterministic regex financial parser.
- **Dual-Criteria Reconciliation:** Cross-checks payment link records, extracted receipt claims, and Wema bank ledger records matching both **Transfer Amount** and **Beneficiary Name**.
- **AI Forensics & Tampering Detection:** Calculates originality ratings (0–100%) and detects altered typography and synthetic slips.
- **Direct Receipt Upload Endpoint:** `POST /api/v1/public/receipt-upload/direct` allows verifying slips directly for any merchant account.
- **Live AI Key Diagnostics Endpoint:** `POST /api/v1/ai-monitor/test-live` tests all configured API keys and models in real-time.
- **100% Pytest Test Suite:** 17 comprehensive unit and integration tests.

---

## Setup & Running the Server

### 1. Create and Activate Virtual Environment

```bash
cd fastapi-backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
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

Ensure `.env` contains your preferred configuration:

```env
APP_ENV=development
DEBUG=True
DATABASE_URL=sqlite:///./data/paypruf.db
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_BACKUP_KEYS=your_backup_gemini_key_1,your_backup_gemini_key_2
GEMINI_MODEL=gemini-3.5-flash
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
UPLOAD_DIR=./uploads/receipts
MAX_UPLOAD_SIZE_BYTES=8388608
```

### 4. Start the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Or run directly using the virtual environment without activating:

```bash
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Running the Pytest Suite

Run all unit and integration tests with pytest:

```bash
PYTHONPATH=. .venv/bin/python -m pytest -v
```

---

## Default Demo Credentials

- **Wema Account Number:** `0123456789`
- **Email:** `tolafashion@example.com`
- **Phone:** `08012345678`
- **Password:** `demopassword123`
