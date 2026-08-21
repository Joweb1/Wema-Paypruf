from __future__ import annotations

from typing import Any

import pytest

from backend.app.core.enums import ProviderStatus
from backend.app.models import Verification
from backend.tests.conftest import ApiEnvironment


def _prepare(
    api: ApiEnvironment,
    *,
    expected_amount: str,
    receipt_amount: str,
    receipt_reference: str,
) -> dict[str, Any]:
    payment = api.create_payment(amount=expected_amount)
    api.extractor.configure(amount=receipt_amount, reference=receipt_reference)
    upload = api.upload(payment["id"])
    assert upload.status_code == 201, upload.text
    return payment


@pytest.mark.parametrize(
    ("case", "expected_status", "reason_code", "transaction_amount", "provider_status"),
    (
        ("confirmed", "CONFIRMED", "MATCH_CONFIRMED", "25000.00", ProviderStatus.SUCCESS),
        ("mismatch", "MISMATCH", "AMOUNT_MISMATCH", "20000.00", ProviderStatus.SUCCESS),
        ("pending", "PENDING", "BANK_TRANSACTION_PENDING", "30000.00", ProviderStatus.PENDING),
    ),
)
def test_reference_linked_matching_outcomes(
    api: ApiEnvironment,
    case: str,
    expected_status: str,
    reason_code: str,
    transaction_amount: str,
    provider_status: ProviderStatus,
) -> None:
    amount = "30000.00" if case == "pending" else "25000.00"
    reference = {
        "confirmed": "PAYPRUF-DEMO-001",
        "mismatch": "PAYPRUF-DEMO-002",
        "pending": "PAYPRUF-DEMO-004",
    }[case]
    payment = _prepare(
        api,
        expected_amount=amount,
        receipt_amount=amount,
        receipt_reference=reference,
    )
    api.add_transaction(
        provider_reference=reference,
        amount=transaction_amount,
        status=provider_status,
    )

    response = api.client.post(f"/api/payments/{payment['id']}/verify")

    assert response.status_code == 200, response.text
    assert response.json()["status"] == expected_status
    assert response.json()["reason_code"] == reason_code
    detail = api.client.get(f"/api/payments/{payment['id']}").json()
    assert detail["payment"]["status"] == expected_status


def test_missing_transaction_is_not_received(api: ApiEnvironment) -> None:
    payment = _prepare(
        api,
        expected_amount="15000.00",
        receipt_amount="15000.00",
        receipt_reference="PAYPRUF-DEMO-003",
    )

    response = api.client.post(f"/api/payments/{payment['id']}/verify")

    assert response.status_code == 200
    assert response.json()["status"] == "NOT_RECEIVED"
    assert response.json()["reason_code"] == "TRANSACTION_NOT_FOUND"
    assert response.json()["transaction"] is None


def test_incorrect_receipt_reference_is_mismatch_via_payment_reference_link(
    api: ApiEnvironment,
) -> None:
    payment = _prepare(
        api,
        expected_amount="25000.00",
        receipt_amount="25000.00",
        receipt_reference="BANK-WRONG-REFERENCE",
    )
    api.add_transaction(
        provider_reference="BANK-ACTUAL-REFERENCE",
        payment_reference=payment["reference"],
        amount="25000.00",
        status=ProviderStatus.SUCCESS,
    )

    response = api.client.post(f"/api/payments/{payment['id']}/verify")

    assert response.status_code == 200
    assert response.json()["status"] == "MISMATCH"
    assert response.json()["reason_code"] == "REFERENCE_MISMATCH"
    assert response.json()["reference_match"] is False


def test_verify_and_recheck_are_idempotent(api: ApiEnvironment) -> None:
    payment = _prepare(
        api,
        expected_amount="25000.00",
        receipt_amount="25000.00",
        receipt_reference="IDEMPOTENT-001",
    )
    api.add_transaction(
        provider_reference="IDEMPOTENT-001",
        amount="25000.00",
        status=ProviderStatus.SUCCESS,
    )

    first = api.client.post(f"/api/payments/{payment['id']}/verify")
    second = api.client.post(f"/api/payments/{payment['id']}/recheck")
    third = api.client.post(f"/api/public/payments/{payment['public_token']}/recheck")

    assert first.status_code == second.status_code == third.status_code == 200
    assert first.json()["id"] == second.json()["id"] == third.json()["id"]
    with api.database.session_factory() as session:
        assert session.query(Verification).count() == 1


def test_transaction_cannot_confirm_two_payment_requests(api: ApiEnvironment) -> None:
    first = _prepare(
        api,
        expected_amount="25000.00",
        receipt_amount="25000.00",
        receipt_reference="ONE-TIME-001",
    )
    second = _prepare(
        api,
        expected_amount="25000.00",
        receipt_amount="25000.00",
        receipt_reference="ONE-TIME-001",
    )
    api.add_transaction(
        provider_reference="ONE-TIME-001",
        amount="25000.00",
        status=ProviderStatus.SUCCESS,
    )

    first_result = api.client.post(f"/api/payments/{first['id']}/verify")
    second_result = api.client.post(f"/api/payments/{second['id']}/verify")

    assert first_result.status_code == second_result.status_code == 200
    assert first_result.json()["status"] == "CONFIRMED"
    assert second_result.json()["status"] == "MISMATCH"
    assert second_result.json()["reason_code"] == "TRANSACTION_ALREADY_USED"
