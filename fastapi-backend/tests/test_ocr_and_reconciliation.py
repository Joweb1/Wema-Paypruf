"""Unit and Integration tests for Public Payment Portal, OCR Extraction, and Reconciliation."""

from __future__ import annotations

import io
from pathlib import Path
from PIL import Image


def _create_sample_receipt_image() -> io.BytesIO:
    """Generate a small valid test PNG image."""
    img = Image.new("RGB", (600, 800), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_public_payment_portal_view(client):
    """Customer views payment link."""
    token = "tok_chin_98234"
    res = client.get(f"/api/v1/public/pay/{token}")
    assert res.status_code == 200
    data = res.json()

    assert data["payment"]["customer_name"] == "Chinedu Okafor"
    assert "Tola Fashion" in data["merchant"]["business_name"]
    assert data["payment_instructions"]["account_number"] == "0123456789"
    assert data["payment_instructions"]["bank_name"] == "Wema Bank (Demo Sandbox)"


def test_upload_receipt_and_reconcile(client, auth_headers):
    """End-to-end flow: Create payment -> Upload receipt -> OCR extract -> Bank reconcile."""
    # 1. Create payment
    create_res = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "customer_name": "Ngozi Eze",
            "amount": "25,000.00",
            "description": "Lace Gown",
        }
    )
    assert create_res.status_code == 201
    payment = create_res.json()
    token = payment["public_token"]

    # 2. Upload receipt as customer
    img_buf = _create_sample_receipt_image()
    upload_res = client.post(
        f"/api/v1/public/pay/{token}/receipt",
        files={"file": ("test_receipt.png", img_buf, "image/png")}
    )
    assert upload_res.status_code == 200
    receipt_data = upload_res.json()
    assert receipt_data["original_filename"] == "test_receipt.png"
    assert "confidence" in receipt_data
    assert receipt_data["confidence"] > 0

    # 3. Verify public payment (Bank Ledger Reconciliation)
    ver_res = client.post(f"/api/v1/public/pay/{token}/verify")
    assert ver_res.status_code == 200
    ver = ver_res.json()
    assert ver["status"] in ["CONFIRMED", "PENDING", "MISMATCH", "NOT_RECEIVED"]
    assert ver["reason_code"] != ""
    assert "comparison" in ver
    assert "timeline" in ver
    assert len(ver["timeline"]) >= 2


def test_direct_account_receipt_upload(client):
    """Test direct upload of receipt for an account."""
    img_buf = _create_sample_receipt_image()
    res = client.post(
        "/api/v1/public/receipt-upload/direct?accountName=Tola%20Fashion",
        files={"file": ("receipt.png", img_buf, "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CONFIRMED"
    assert data["accountName"] == "Tola Fashion"
    assert "amount" in data
    assert "reference" in data
