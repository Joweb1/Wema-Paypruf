"""Unit and Integration tests for Merchant Payments and Dashboard."""

from __future__ import annotations


def test_dashboard_metrics(client, auth_headers):
    """Test dashboard metrics calculation."""
    res = client.get("/api/v1/merchant/dashboard", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert "merchant" in data
    assert "total" in data
    assert "confirmed" in data
    assert "pending" in data
    assert "mismatch" in data
    assert "not_received" in data
    assert "recent_payments" in data

    assert data["total"]["count"] >= 4
    assert data["confirmed"]["count"] >= 1
    assert data["pending"]["count"] >= 1
    assert data["mismatch"]["count"] >= 1
    assert data["not_received"]["count"] >= 1
    assert data["total"]["value"] > 0


def test_create_and_get_payment(client, auth_headers):
    """Test creating a new payment request and retrieving its details."""
    payload = {
        "customer_name": "Babajide Sanwo",
        "customer_phone": "+2348011223344",
        "amount": "35,000.00",
        "description": "Custom Embroidery Agbada Set",
        "order_note": "Size XXL in Emerald Green",
        "expires_in_hours": 48,
    }
    create_res = client.post("/api/v1/payments", headers=auth_headers, json=payload)
    assert create_res.status_code == 201
    payment = create_res.json()

    assert payment["customer_name"] == "Babajide Sanwo"
    assert payment["amount"] == "35000.00"
    assert payment["reference"].startswith("PRF-")
    assert payment["status"] == "PENDING"
    assert "public_token" in payment

    # Retrieve full payment details
    pay_id = payment["id"]
    get_res = client.get(f"/api/v1/payments/{pay_id}", headers=auth_headers)
    assert get_res.status_code == 200
    details = get_res.json()
    assert details["payment"]["id"] == pay_id
    assert details["merchant"]["bank_name"] == "Wema Bank (Sandbox)"


def test_list_payments(client, auth_headers):
    """List merchant payments."""
    res = client.get("/api/v1/payments", headers=auth_headers)
    assert res.status_code == 200
    payments = res.json()
    assert isinstance(payments, list)
    assert len(payments) >= 4
