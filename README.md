# PayPruf — AI-Powered Payment Receipt Intelligence & Bank Ledger Reconciliation

## Team Members
- Uroh Jonadab
- Emmanuel
- [Add remaining team member]

---

## 🚀 Live Demo

- **Live Application:** [Add deployed application URL]
- **Backend API:** [Add live backend API URL]
- **Recorded Demo:** [Add Loom/demo video URL]

---

## 🎯 The Problem

> **How might we make bank-transfer payments easier to verify and reconcile for customers and online merchants?**

Customers can successfully transfer money but still have uncertainty about whether a merchant has received it. Merchants also have to manually check their bank account and compare incoming payments with receipts sent by customers, creating delays, disputes, and opportunities for fake payment receipts.

---

## ✨ Our Solution

**PayPruf** is an AI-powered payment receipt verification and bank-ledger reconciliation platform for online merchants.

Customers can upload their transfer receipt through a merchant's PayPruf payment link. PayPruf uses AI to extract and validate transaction information, then reconciles it against the merchant's bank transaction records.

The merchant gets a clear view of verified and unresolved payments, while customers can know whether their payment has actually reached the merchant instead of relying only on a receipt or verbal confirmation.

PayPruf also includes a **customer fraud-reporting feature**, allowing users to report problematic merchant accounts and helping provide risk information before future transfers.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL / Supabase
- **AI:** Google Gemini 3.5 Multimodal Vision AI
- **AI Backup:** NVIDIA Cloud Vision AI
- **OCR Fallback:** Local RapidOCR + deterministic regex extraction
- **Bank Integration:** Wema Bank ledger reconciliation
- **Authentication:** JWT-based authentication
- **Testing:** Pytest
- **API Documentation:** FastAPI Swagger / ReDoc

---

## ⚙️ How to Set Up and Run Locally

### Prerequisites

- Node.js v18+
- Python v3.10+
- Git

### 1. Clone the repository

```bash
git clone [your-repository-url]
cd paypruf
```

### 2. Start the FastAPI backend

```bash
cd fastapi-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend:
`http://localhost:8000`

Swagger API documentation:
`http://localhost:8000/docs`

### 3. Start the React frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:
`http://localhost:5173`

### 4. Environment Variables

Configure the required values in `fastapi-backend/.env`:

```env
DATABASE_URL=...
JWT_SECRET=...
GEMINI_API_KEY=...
GEMINI_BACKUP_KEYS=...
GEMINI_MODEL=...
NVIDIA_API_KEY=...
NVIDIA_MODEL=...
UPLOAD_DIR=...
```

### 5. Run Backend Tests

```bash
cd fastapi-backend
PYTHONPATH=. .venv/bin/python -m pytest -v
```

---

## 🏆 Hackathon Context

PayPruf was developed for **Hackaholics 7.0** to address a real financial problem within the banking ecosystem: uncertainty and disputes around bank-transfer payments.

The project demonstrates how AI-powered receipt intelligence, bank-ledger reconciliation, and a merchant-facing dashboard can work together to make payment verification faster, clearer, and more trustworthy.

For the hackathon prototype, the system demonstrates the concept using the available Wema Bank ledger integration/sandbox environment rather than relying on production banking infrastructure.

**Project documentation:** [View the Technical README](TECHNICAL_README.md)
