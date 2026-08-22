"""Unit and Integration tests for Risk Intelligence and Fraud Reporting."""

from __future__ import annotations


def test_lookup_account_directory(client):
    """Search registered merchant directory."""
    # 1. Known registered merchant
    res1 = client.get("/api/v1/risk/lookup/0123456789")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["accountNumber"] == "0123456789"
    assert data1["registered"] is True
    assert "Tola Fashion" in data1["accountName"]

    # 2. Unregistered account
    res2 = client.get("/api/v1/risk/lookup/9999999999")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["registered"] is False


def test_check_account_risk_clean(client):
    """Check risk on clean account."""
    res = client.get("/api/v1/risk/check/0123456789")
    assert res.status_code == 200
    data = res.json()
    assert data["riskLevel"] == "CLEAN"
    assert data["hasReports"] is False
    assert data["reportCount"] == 0
    assert "No Community Reports Found" in data["alertTitle"]


def test_check_account_risk_flagged(client):
    """Check risk on flagged merchant account with incident history."""
    res = client.get("/api/v1/risk/check/0987654321")
    assert res.status_code == 200
    data = res.json()
    assert data["riskLevel"] == "FLAGGED"
    assert data["hasReports"] is True
    assert data["reportCount"] >= 3
    assert len(data["reports"]) >= 1
    assert "Caution Advised: Account Flagged" in data["alertTitle"]


def test_report_merchant_fraud(client):
    """Submit a verified fraud incident report."""
    payload = {
        "accountNumber": "2233445566",
        "merchantName": "Zara Organics Lagos",
        "reason": "Refused goods/service delivery after verified payment settlement",
        "details": "Customer paid ₦50,000 via Wema transfer but order was cancelled without refund.",
        "paymentRef": "PRF-2026-TEST-99",
        "reporterName": "Amaka Johnson",
    }
    res = client.post("/api/v1/risk/report", json=payload)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Check risk again for this account to ensure incident appears
    check_res = client.get("/api/v1/risk/check/2233445566")
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["hasReports"] is True
    assert check_data["riskLevel"] == "FLAGGED"
