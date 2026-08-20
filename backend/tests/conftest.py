from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.core.config import Settings
from backend.app.core.enums import ProviderStatus
from backend.app.core.time import utcnow
from backend.app.db import Database, create_database
from backend.app.main import create_app
from backend.app.models import MerchantTransaction
from backend.app.seed import DEMO_MERCHANT_ID, create_demo_merchant


def png_bytes() -> bytes:
    stream = BytesIO()
    Image.new("RGB", (640, 900), "white").save(stream, format="PNG")
    return stream.getvalue()


@dataclass(slots=True)
class FakeExtractor:
    values: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.configure()

    def configure(self, **overrides: Any) -> None:
        now = utcnow()
        values: dict[str, Any] = {
            "amount": Decimal("25000.00"),
            "currency": "NGN",
            "reference": "PAYPRUF-DEMO-001",
            "bank": "Demo Bank",
            "transaction_date": now.date(),
            "transaction_time": now.time().replace(microsecond=0, tzinfo=None),
            "sender_name": "Chinedu Okafor",
            "recipient_name": "Tola Fashion Demo",
            "status_text": "Successful",
            "account_hint": "ending 6789",
            "confidence": 0.98,
            "raw_text": "Synthetic receipt test evidence",
        }
        values.update(overrides)
        self.values = values

    def extract(self, path: Path, mime_type: str) -> dict[str, Any]:
        assert path.is_file()
        assert mime_type in {"image/png", "image/jpeg", "application/pdf"}
        return self.values.copy()


@dataclass(slots=True)
class ApiEnvironment:
    client: TestClient
    database: Database
    extractor: FakeExtractor

    def create_payment(
        self,
        *,
        customer_name: str = "Chinedu Okafor",
        amount: str = "25000.00",
    ) -> dict[str, Any]:
        response = self.client.post(
            "/api/payments",
            json={
                "customer_name": customer_name,
                "customer_phone": "+2348000000010",
                "amount": amount,
                "description": "Test order payment",
                "order_note": "Synthetic API test",
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    def upload(self, payment_id: str, *, filename: str = "receipt.png"):
        return self.client.post(
            f"/api/payments/{payment_id}/receipt",
            files={"file": (filename, png_bytes(), "image/png")},
        )

    def add_transaction(
        self,
        *,
        provider_reference: str,
        amount: str,
        status: ProviderStatus,
        payment_reference: str | None = None,
        claimed_by_payment_id: str | None = None,
    ) -> str:
        transaction_id = str(uuid.uuid4())
        amount_minor = int(Decimal(amount) * 100)
        with self.database.session_factory() as session:
            session.add(
                MerchantTransaction(
                    id=transaction_id,
                    merchant_id=DEMO_MERCHANT_ID,
                    provider="WEMA_MOCK",
                    provider_reference=provider_reference,
                    payment_reference=payment_reference,
                    amount_minor=amount_minor,
                    currency="NGN",
                    sender_name="Chinedu Okafor",
                    recipient_account_hint="ending 6789",
                    status=status,
                    transaction_date=utcnow() - timedelta(minutes=2),
                    raw_payload=json.dumps({"environment": "test", "status": status.value}),
                    claimed_by_payment_id=claimed_by_payment_id,
                )
            )
            session.commit()
        return transaction_id


@pytest.fixture
def api(tmp_path: Path) -> ApiEnvironment:
    database_path = (tmp_path / "paypruf-test.db").resolve()
    settings = Settings(
        database_url=f"sqlite:///{database_path.as_posix()}",
        upload_dir=tmp_path / "uploads",
        public_app_url="http://testserver",
        frontend_url="http://testserver",
        cors_origins="http://testserver",
        seed_demo_data=False,
        log_level="CRITICAL",
        jwt_secret="test-secret",
        _env_file=None,
    )
    database = create_database(settings.database_url)
    extractor = FakeExtractor()
    app = create_app(settings, database=database, receipt_extractor=extractor)

    with TestClient(app) as client:
        with database.session_factory() as session:
            session.add(create_demo_merchant())
            session.commit()
        yield ApiEnvironment(client=client, database=database, extractor=extractor)
