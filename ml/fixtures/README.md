# Synthetic receipt fixtures

These generic fixtures contain no real bank logo, account, customer, or payment.
Regenerate them from the repository root after installing `ml/requirements.txt`:

```text
python -m ml.fixtures.generate_fixtures
```

The four PNG files cover confirmed, mismatch, not-received, and pending demo
references. JPEG and single-page PDF variants exercise the additional accepted
upload formats. A receipt's scenario filename is test metadata only; receipt
intelligence never returns a payment decision.
