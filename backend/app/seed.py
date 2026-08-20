from __future__ import annotations

import argparse
import hashlib
import json
import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.core.config import Settings, get_settings
from backend.app.core.enums import PaymentStatus, ProviderStatus, WorkflowStage
from backend.app.core.logging import configure_logging
from backend.app.core.time import utcnow
from backend.app.db import Database, create_database
from backend.app.models import (
    Merchant,
    MerchantTransaction,
    PaymentRequest,
    Receipt,
    Verification,
)
from backend.app.providers.wema import MockWemaTransactionProvider
from backend.app.services.matching import verify_payment
from backend.app.services.normalization import minor_to_money

logger = logging.getLogger(__name__)
DEMO_MERCHANT_ID = "10000000-0000-4000-8000-000000000001"


@dataclass(frozen=True, slots=True)
class SeedScenario:
    customer_name: str
    customer_phone: str | None
    amount_minor: int
    description: str
    reference: str
    bank_reference: str
    receipt_amount_minor: int
    transaction_amount_minor: int | None
    transaction_status: ProviderStatus | None


DASHBOARD_SCENARIOS = (
    SeedScenario(
        "Chinedu Okafor",
        "+2348000000001",
        2_500_000,
        "Blue kaftan order",
        "PRUF-SEED01",
        "SEED-CONFIRMED-001",
        2_500_000,
        2_500_000,
        ProviderStatus.SUCCESS,
    ),
    SeedScenario(
        "Aisha Bello",
        "+2348000000002",
        2_500_000,
        "Ready-to-wear order",
        "PRUF-SEED02",
        "SEED-MISMATCH-001",
        2_500_000,
        2_000_000,
        ProviderStatus.SUCCESS,
    ),
    SeedScenario(
        "Tolu Adeyemi",
        None,
        1_500_000,
        "Alteration service",
        "PRUF-SEED03",
        "SEED-NOT-RECEIVED-001",
        1_500_000,
        None,
        None,
    ),
    SeedScenario(
        "Ngozi Eze",
        "+2348000000004",
        3_000_000,
        "Aso-ebi deposit",
        "PRUF-SEED04",
        "SEED-PENDING-001",
        3_000_000,
        3_000_000,
        ProviderStatus.PENDING,
    ),
)


def create_demo_merchant() -> Merchant:
    return Merchant(
        id=DEMO_MERCHANT_ID,
        business_name="Tola Fashion",
        display_name="Tola Fashion",
        phone="+2348000000000",
        wema_account_name="Tola Fashion Demo",
        wema_account_number="0123456789",
        created_at=utcnow(),
    )


def _transaction(
    merchant: Merchant,
    provider_reference: str,
    amount_minor: int,
    status: ProviderStatus,
    transaction_date,
    *,
    payment_reference: str | None = None,
    sender_name: str | None = None,
) -> MerchantTransaction:
    payload = {
        "environment": "Wema Sandbox / Demo Environment",
        "reference": provider_reference,
        "status": status.value,
    }
    return MerchantTransaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant.id,
        provider="WEMA_MOCK",
        provider_reference=provider_reference,
        payment_reference=payment_reference,
        amount_minor=amount_minor,
        currency="NGN",
        sender_name=sender_name,
        recipient_account_hint="ending 6789",
        status=status,
        transaction_date=transaction_date,
        raw_payload=json.dumps(payload),
    )


def ensure_interactive_demo_transactions(session: Session, merchant: Merchant) -> None:
    now = utcnow()
    fixtures = (
        ("PAYPRUF-DEMO-001", 2_500_000, ProviderStatus.SUCCESS, "Chinedu Okafor"),
        ("PAYPRUF-DEMO-002", 2_000_000, ProviderStatus.SUCCESS, "Aisha Bello"),
        ("PAYPRUF-DEMO-004", 3_000_000, ProviderStatus.PENDING, "Ngozi Eze"),
    )
    existing = set(
        session.scalars(
            select(MerchantTransaction.provider_reference).where(
                MerchantTransaction.provider == "WEMA_MOCK"
            )
        ).all()
    )
    for index, (reference, amount, status, sender) in enumerate(fixtures):
        if reference not in existing:
            session.add(
                _transaction(
                    merchant,
                    reference,
                    amount,
                    status,
                    now - timedelta(minutes=30 - index),
                    sender_name=sender,
                )
            )
    session.commit()


def _create_receipt_image(path: Path, scenario: SeedScenario) -> None:
    from PIL import Image, ImageDraw

    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (900, 600), "white")
    draw = ImageDraw.Draw(image)
    lines = (
        "SYNTHETIC PAYMENT RECEIPT",
        "Demo Bank - not a real bank document",
        f"Amount: NGN {minor_to_money(scenario.receipt_amount_minor)}",
        f"Reference: {scenario.bank_reference}",
        f"Sender: {scenario.customer_name}",
        "Recipient: Tola Fashion Demo",
        "Status: Successful",
    )
    y = 70
    for line in lines:
        draw.text((70, y), line, fill="#241f20")
        y += 62
    image.save(path, format="PNG")


def _seed_dashboard(
    session: Session,
    merchant: Merchant,
    settings: Settings,
) -> None:
    provider = MockWemaTransactionProvider(settings)
    now = utcnow()
    for index, scenario in enumerate(DASHBOARD_SCENARIOS):
        created_at = now - timedelta(hours=5 - index)
        payment = PaymentRequest(
            id=str(uuid.uuid4()),
            merchant_id=merchant.id,
            customer_name=scenario.customer_name,
            customer_phone=scenario.customer_phone,
            amount_minor=scenario.amount_minor,
            currency="NGN",
            description=scenario.description,
            order_note="Synthetic demo data",
            reference=scenario.reference,
            public_token=f"demo-{uuid.uuid4().hex}",
            status=PaymentStatus.PENDING,
            stage=WorkflowStage.READY_TO_VERIFY,
            status_reason="Receipt extracted and ready for verification.",
            expires_at=now + timedelta(hours=24),
            first_opened_at=created_at + timedelta(minutes=5),
            created_at=created_at,
            updated_at=created_at,
        )
        session.add(payment)
        session.flush()

        receipt_path = settings.upload_dir / f"seed-{index + 1}.png"
        _create_receipt_image(receipt_path, scenario)
        content = receipt_path.read_bytes()
        receipt = Receipt(
            id=str(uuid.uuid4()),
            payment_id=payment.id,
            original_filename=f"synthetic-receipt-{index + 1}.png",
            storage_path=str(receipt_path.resolve()),
            mime_type="image/png",
            size_bytes=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
            amount_minor=scenario.receipt_amount_minor,
            currency="NGN",
            reference=scenario.bank_reference,
            bank="Demo Bank",
            transaction_date=now.date(),
            transaction_time=(created_at + timedelta(minutes=15)).time().replace(tzinfo=None),
            sender_name=scenario.customer_name,
            recipient_name="Tola Fashion Demo",
            status_text="Successful",
            account_hint="ending 6789",
            confidence=0.98,
            raw_text=(
                f"Amount NGN {minor_to_money(scenario.receipt_amount_minor)} "
                f"Reference {scenario.bank_reference} Recipient Tola Fashion Demo"
            ),
            extraction_provider="synthetic-seed",
            created_at=created_at + timedelta(minutes=20),
            extracted_at=created_at + timedelta(minutes=20, seconds=2),
        )
        session.add(receipt)
        session.flush()

        if scenario.transaction_status is not None and scenario.transaction_amount_minor is not None:
            session.add(
                _transaction(
                    merchant,
                    scenario.bank_reference,
                    scenario.transaction_amount_minor,
                    scenario.transaction_status,
                    created_at + timedelta(minutes=15),
                    payment_reference=payment.reference,
                    sender_name=scenario.customer_name,
                )
            )
        session.commit()
        payment.merchant = merchant
        verify_payment(session, payment, provider)


def seed_demo_data(session: Session, settings: Settings) -> Merchant:
    merchant = session.scalar(select(Merchant).order_by(Merchant.created_at).limit(1))
    if merchant is None:
        merchant = create_demo_merchant()
        session.add(merchant)
        session.commit()
        _seed_dashboard(session, merchant, settings)
    ensure_interactive_demo_transactions(session, merchant)
    logger.info("demo_data_seeded", extra={"event": "demo_data_seeded"})
    return merchant


def reset_demo_data(session: Session, settings: Settings) -> Merchant:
    upload_root = settings.upload_dir.resolve()
    tracked_paths = list(session.scalars(select(Receipt.storage_path)).all())
    session.execute(delete(Verification))
    for transaction in session.scalars(select(MerchantTransaction)).all():
        transaction.claimed_by_payment_id = None
    session.flush()
    session.execute(delete(Receipt))
    session.execute(delete(MerchantTransaction))
    session.execute(delete(PaymentRequest))
    session.execute(delete(Merchant))
    session.commit()
    for raw_path in tracked_paths:
        path = Path(raw_path).resolve()
        if path.is_relative_to(upload_root):
            path.unlink(missing_ok=True)
    return seed_demo_data(session, settings)


def initialize_database(database: Database, settings: Settings, *, reset: bool = False) -> None:
    database.create_schema()
    with database.session_factory() as session:
        if reset:
            reset_demo_data(session, settings)
        else:
            seed_demo_data(session, settings)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the PayPruf demo database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear PayPruf demo rows and recreate deterministic demo data.",
    )
    args = parser.parse_args()
    settings = get_settings()
    configure_logging(settings.log_level)
    database = create_database(settings.database_url)
    initialize_database(database, settings, reset=args.reset)
    print("PayPruf demo data reset." if args.reset else "PayPruf demo data ready.")


if __name__ == "__main__":
    main()
