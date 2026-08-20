"""PayBridge Receipt Intelligence.

Turns an uploaded payment receipt image into a structured, normalized
"payment claim" that the backend verification engine can match against
the merchant's transaction data.

BOUNDARY: this package answers "what does the receipt claim?" — NEVER
"is this payment genuine?". Verification (CONFIRMED / PENDING / MISMATCH /
NOT_RECEIVED / UNMATCHED) is the backend's job. This package never returns
REAL / FAKE / FRAUD.
"""

__version__ = "0.1.0"
