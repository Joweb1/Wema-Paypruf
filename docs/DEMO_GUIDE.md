# PayPruf demo guide

This is the short, deterministic judging flow. It demonstrates that receipt
OCR is useful evidence while merchant-side transaction data remains the source
of confirmation.

## Before the demo

1. Start from the repository root and reset the local demo database:

   ```powershell
   .\.venv\Scripts\python.exe -m backend.app.seed --reset
   ```

2. Start FastAPI on port 8000.
3. Start the Vite client on port 5173.
4. Check `http://localhost:8000/api/health`. Confirm that the database is `ok`
   and the Wema provider is `mock`.
5. Open `http://localhost:5173/dashboard` and keep the synthetic receipts in
   `ml/fixtures` available for upload.

## Story to explain

> A customer says they paid. PayPruf reads the receipt, checks the merchant's
> Wema sandbox/demo transaction data, compares the two sources, and gives the
> merchant a clear, traceable answer.

Do not describe OCR as proof of payment. Point out the receipt, merchant
transaction, side-by-side comparison, and timeline on Payment Details.

## Golden path: confirmed

1. On Dashboard, choose **Create payment**.
2. Enter a customer, amount `25000`, and a short description.
3. Create the request and show its unique `PRUF-` reference.
4. Demonstrate **Copy link** and **Share on WhatsApp** (a prefilled deep link,
   not a Business API integration).
5. Open the customer payment page.
6. Point out the clearly labelled Wema Sandbox / Demo Environment instructions.
7. Upload the `PAYPRUF-DEMO-001` PNG fixture and choose **Verify payment**.
8. Show the staged verification progress and the `CONFIRMED` result.
9. Return to Dashboard and show the updated status.
10. Open Payment Details and show extracted receipt data, merchant transaction,
    comparison, and verification timeline.

## Required contrast cases

- Create/open a ₦25,000 request and upload `PAYPRUF-DEMO-002`: merchant-side
  data says ₦20,000, so the result is `MISMATCH` and the comparison must show all
  three amounts.
- Create/open a ₦15,000 request and upload `PAYPRUF-DEMO-003`: no corresponding
  merchant transaction exists, so the result is `NOT_RECEIVED`.
- Create/open a ₦30,000 request and upload `PAYPRUF-DEMO-004`: the merchant-side
  transaction exists but is unsettled, so the result is `PENDING` and offers a
  recheck action.

## Recovery

- If demo data has been changed, run
  `.\.venv\Scripts\python.exe -m backend.app.seed --reset` again from the
  repository root.
- If a receipt is wrong, use **Replace receipt**; upload is intentionally one
  current receipt per request and does not create uncontrolled duplicates.
- If the UI cannot reach the API, check `/api/health`, the frontend dev proxy,
  and that FastAPI is on port 8000.
- If OCR rejects a poor photo, use the included synthetic fixtures to retain a
  reliable offline demo.
