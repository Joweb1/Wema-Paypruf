# PayPruf Frontend Application

Modern, high-performance web dashboard and public verification portal for **PayPruf**, built with **React 19**, **Vite 6**, **React Router 7**, **TanStack React Query**, and **Tailwind CSS 4**.

---

## Features

- **Merchant Portal:**
  - Secure login via Wema Account Number, Email, or Phone + Password.
  - Payment Link Generator with custom amounts, customer names, and expiration timers.
  - Real-time Ledger Verification Hub with 5-point cross-check matrix.
  - Interactive AI Key Failover Monitor & Live Diagnostic drawer.
- **Public Customer Portal:**
  - Branded payment links (`/pay/:token`).
  - Seamless receipt image/PDF drag-and-drop uploader.
  - Direct public receipt upload by merchant account (`/receipt-upload/:accountName`).
  - Interactive status verification page with AI originality score & forensic breakdown.

---

## Prerequisites

- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Backend Server:** Running on `http://localhost:8000` (for API proxying)

---

## Setup & Running the Frontend

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The app will be accessible at:
- **Local Application:** [http://localhost:5173](http://localhost:5173) (or `http://localhost:3000`)

---

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The compiled static assets will be written to the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

---

## Proxy Configuration

Vite is configured in `vite.config.js` to automatically proxy all `/api` requests to the FastAPI backend running at `http://localhost:8000`.
