"""Seed data initialization for demo merchant, directory, payments, and fraud reports."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.fraud_report import FraudReport, FraudIncident
from app.models.payment import Payment, Receipt, BankTransaction, Verification
from app.models.user import User, MerchantDirectory

DEMO_USER_ID = "usr_wema_demo_01"


def seed_initial_data(db: Session) -> None:
    """Seed initial demo accounts and scenario payments if not already present."""
    now = datetime.now(timezone.utc)

    # 1. Seed Demo User
    demo_user = db.query(User).filter(User.id == DEMO_USER_ID).first()
    if not demo_user:
        demo_user = User(
            id=DEMO_USER_ID,
            full_name="Tola Adeyemi",
            email="tolafashion@example.com",
            phone="08012345678",
            wema_account_number="0123456789",
            account_name="Tola Fashion Enterprise",
            business_name="Tola Fashion",
            hashed_password=hash_password("demopassword123"),
            merchant_onboarding_completed=True,
            created_at=now - timedelta(days=30),
        )
        db.add(demo_user)
        db.flush()

    # 2. Seed Registered Merchants Directory
    sample_directory = [
        {"accountNumber": "0123456789", "accountName": "Tola Fashion Enterprise", "businessName": "Tola Fashion"},
        {"accountNumber": "0987654321", "accountName": "Apex Luxury Wears Ltd", "businessName": "Apex Luxury Wears"},
        {"accountNumber": "5544332211", "accountName": "QuickGadgets Direct Nigeria", "businessName": "QuickGadgets Direct"},
        {"accountNumber": "2233445566", "accountName": "Zara Organics Lagos", "businessName": "Zara Organics"},
        {"accountNumber": "1122334455", "accountName": "Kano Textiles & Dyeing", "businessName": "Kano Textiles"},
    ]

    for m in sample_directory:
        existing = db.query(MerchantDirectory).filter(MerchantDirectory.account_number == m["accountNumber"]).first()
        if not existing:
            dir_entry = MerchantDirectory(
                account_number=m["accountNumber"],
                account_name=m["accountName"],
                business_name=m["businessName"],
                bank_name="Wema Bank / ALAT",
                registered=True,
            )
            db.add(dir_entry)

    # 3. Seed Fraud Reports
    report_seed_1 = db.query(FraudReport).filter(FraudReport.account_number == "0987654321").first()
    if not report_seed_1:
        r1 = FraudReport(
            id="rep_seed_01",
            account_number="0987654321",
            merchant_name="Apex Luxury Wears Ltd",
            reported_by="3 Verified Merchants",
            reporters_count=3,
            date="8/12/2026",
            reason="Reported 4 times for issuing fake payment receipts and reverse transfers",
            details="Merchant repeatedly shared altered screenshot receipts claiming successful transfer, then initiated reversal claims against suppliers.",
            created_at=now - timedelta(days=10),
        )
        db.add(r1)
        db.flush()

        incidents_1 = [
            FraudIncident(
                id="inc_seed_01",
                report_id=r1.id,
                account_number="0987654321",
                date="8/12/2026",
                reporter="3 Verified Merchants",
                summary="Reported 4 times for issuing fake payment receipts and reverse transfers",
                description="Disputed authentic transfer and claimed non-receipt of verified funds after physical goods collection.",
            ),
            FraudIncident(
                id="inc_seed_02",
                report_id=r1.id,
                account_number="0987654321",
                date="8/10/2026",
                reporter="1 Verified Customer",
                summary="Fake payment receipt generation",
                description="Customer paid via transfer; merchant altered confirmation reference to claim underpayment.",
            ),
            FraudIncident(
                id="inc_seed_03",
                report_id=r1.id,
                account_number="0987654321",
                date="8/05/2026",
                reporter="Verified Supplier",
                summary="Reverse transfer dispute attempt",
                description="Initiated bank recall claiming transaction was uncompleted.",
            ),
        ]
        for inc in incidents_1:
            db.add(inc)

    report_seed_2 = db.query(FraudReport).filter(FraudReport.account_number == "5544332211").first()
    if not report_seed_2:
        r2 = FraudReport(
            id="rep_seed_02",
            account_number="5544332211",
            merchant_name="QuickGadgets Direct Nigeria",
            reported_by="2 Verified Customers",
            reporters_count=2,
            date="8/14/2026",
            reason="Reported 2 times for non-delivery of items following verified transfer payment",
            details="Refused shipment after verified customer payment was confirmed in banking ledger.",
            created_at=now - timedelta(days=8),
        )
        db.add(r2)
        db.flush()

        inc_2 = FraudIncident(
            id="inc_seed_04",
            report_id=r2.id,
            account_number="5544332211",
            date="8/14/2026",
            reporter="2 Verified Customers",
            summary="Non-fulfillment after verified settlement",
            description="Order remained unfulfilled 14 days after verified Wema bank transfer was confirmed.",
        )
        db.add(inc_2)

    # 4. Seed Demo Payments (4 Scenarios)
    existing_payments = db.query(Payment).filter(Payment.merchant_id == DEMO_USER_ID).count()
    if existing_payments == 0:
        # Scenario 1: CONFIRMED
        p1 = Payment(
            id="pay_demo_101",
            merchant_id=DEMO_USER_ID,
            customer_name="Chinedu Okafor",
            customer_phone="+2348023456789",
            amount="25000.00",
            currency="NGN",
            description="Premium Aso-Oke Wedding Fabric (3 yards)",
            order_note="Blue design sample delivery included",
            reference="PRF-2026-CHIN-01",
            public_token="tok_chin_98234",
            public_url="/pay/tok_chin_98234",
            status="CONFIRMED",
            status_reason="Matched with incoming Wema NIP credit of ₦25,000.00 from Chinedu Okafor.",
            created_at=now - timedelta(hours=4),
            expires_at=now + timedelta(hours=48),
        )
        db.add(p1)
        db.flush()

        r1_rec = Receipt(
            id="rec_demo_101",
            payment_id=p1.id,
            original_filename="wema_transfer_receipt_25k.png",
            mime_type="image/png",
            size_bytes=428000,
            preview_url="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
            amount="25000.00",
            currency="NGN",
            reference="NIP/WEMA/202603120194",
            bank="Wema Bank / ALAT",
            status_text="Successful Transaction",
            sender_name="CHINEDU OKAFOR",
            recipient_name="TOLA FASHION ENTERPRISE",
            account_hint="0123456789",
            transaction_date=now - timedelta(hours=3, minutes=48),
            confidence=0.98,
            raw_text="TRANSACTION RECEIPT\nWEMA BANK PLC\nAmount: NGN 25,000.00\nBeneficiary: TOLA FASHION ENTERPRISE\nAccount: 0123456789\nSender: CHINEDU OKAFOR\nRef: NIP/WEMA/202603120194\nStatus: SUCCESSFUL",
        )
        db.add(r1_rec)

        tx1 = BankTransaction(
            id="btx_demo_101",
            payment_id=p1.id,
            provider="WEMA_NIP",
            provider_reference="NIP/WEMA/202603120194",
            payment_reference="PRF-2026-CHIN-01",
            amount="25000.00",
            currency="NGN",
            status="SUCCESS",
            sender_name="Chinedu Okafor",
            recipient_account_hint="0123456789",
            transaction_date=now - timedelta(hours=3, minutes=48),
        )
        db.add(tx1)

        v1 = Verification(
            id="ver_demo_101",
            payment_id=p1.id,
            status="CONFIRMED",
            reason_code="MATCH_EXACT",
            reason="Payment verified. Receipt amount, merchant bank credit, and reference match completely.",
            verified_at=now - timedelta(hours=3, minutes=45),
            amount_match=True,
            reference_match=True,
            currency_match=True,
            merchant_match=True,
            date_match=True,
            comparison_json=json.dumps({
                "expected_amount": "25000.00",
                "receipt_amount": "25000.00",
                "received_amount": "25000.00",
                "receipt_reference": "NIP/WEMA/202603120194",
                "transaction_reference": "NIP/WEMA/202603120194",
            }),
            timeline_json=json.dumps([
                {"title": "Payment link generated", "timestamp": (now - timedelta(hours=4)).isoformat(), "state": "complete"},
                {"title": "Customer opened payment page", "timestamp": (now - timedelta(hours=3, minutes=54)).isoformat(), "state": "complete"},
                {"title": "Receipt uploaded & OCR extracted", "timestamp": (now - timedelta(hours=3, minutes=48)).isoformat(), "state": "complete"},
                {"title": "Merchant ledger matched (Wema sandbox)", "timestamp": (now - timedelta(hours=3, minutes=45)).isoformat(), "state": "complete"},
            ]),
        )
        db.add(v1)

        # Scenario 2: PENDING
        p2 = Payment(
            id="pay_demo_102",
            merchant_id=DEMO_USER_ID,
            customer_name="Aisha Bello",
            customer_phone="+2348034567890",
            amount="45000.00",
            currency="NGN",
            description="Custom Embellished Abaya Set",
            order_note="Size M with matching headscarf",
            reference="PRF-2026-AISH-02",
            public_token="tok_aish_11892",
            public_url="/pay/tok_aish_11892",
            status="PENDING",
            status_reason="Customer uploaded receipt for ₦45,000.00. Bank transfer confirmation is currently processing.",
            created_at=now - timedelta(hours=2),
            expires_at=now + timedelta(hours=24),
        )
        db.add(p2)
        db.flush()

        r2_rec = Receipt(
            id="rec_demo_102",
            payment_id=p2.id,
            original_filename="receipt_aisha_abaya.jpg",
            mime_type="image/jpeg",
            size_bytes=312000,
            preview_url="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80",
            amount="45000.00",
            currency="NGN",
            reference="FT26081290382",
            bank="GTBank / Squad",
            status_text="Pending Settlement",
            sender_name="AISHA BELLO",
            recipient_name="TOLA FASHION",
            account_hint="0123456789",
            transaction_date=now - timedelta(hours=1, minutes=30),
            confidence=0.94,
            raw_text="TRANSFER SLIP\nGTBank NIP\nAmount: NGN 45,000.00\nBeneficiary: TOLA FASHION\nSender: AISHA BELLO\nRef: FT26081290382\nStatus: PENDING",
        )
        db.add(r2_rec)

        tx2 = BankTransaction(
            id="btx_demo_102",
            payment_id=p2.id,
            provider="WEMA_NIP",
            provider_reference="FT26081290382",
            payment_reference="PRF-2026-AISH-02",
            amount="45000.00",
            currency="NGN",
            status="PENDING",
            sender_name="Aisha Bello",
            recipient_account_hint="0123456789",
            transaction_date=now - timedelta(hours=1, minutes=30),
        )
        db.add(tx2)

        v2 = Verification(
            id="ver_demo_102",
            payment_id=p2.id,
            status="PENDING",
            reason_code="PROCESSING_SETTLEMENT",
            reason="Receipt details successfully captured. Bank settlement is still in progress.",
            verified_at=now - timedelta(hours=1, minutes=25),
            amount_match=True,
            reference_match=True,
            currency_match=True,
            merchant_match=True,
            date_match=True,
            comparison_json=json.dumps({
                "expected_amount": "45000.00",
                "receipt_amount": "45000.00",
                "received_amount": "45000.00",
                "receipt_reference": "FT26081290382",
                "transaction_reference": "FT26081290382",
            }),
            timeline_json=json.dumps([
                {"title": "Payment link generated", "timestamp": (now - timedelta(hours=2)).isoformat(), "state": "complete"},
                {"title": "Customer submitted transfer receipt", "timestamp": (now - timedelta(hours=1, minutes=30)).isoformat(), "state": "complete"},
                {"title": "Interbank NIP clearance in progress", "timestamp": (now - timedelta(hours=1, minutes=25)).isoformat(), "state": "current"},
            ]),
        )
        db.add(v2)

        # Scenario 3: MISMATCH
        p3 = Payment(
            id="pay_demo_103",
            merchant_id=DEMO_USER_ID,
            customer_name="Emeka Nwosu",
            customer_phone="+2348045678901",
            amount="60000.00",
            currency="NGN",
            description="Handmade Leather Derby Shoes",
            order_note="Size 43 in Oxblood Brown",
            reference="PRF-2026-EMEK-03",
            public_token="tok_emek_39201",
            public_url="/pay/tok_emek_39201",
            status="MISMATCH",
            status_reason="Receipt uploaded was for ₦50,000.00 instead of requested ₦60,000.00.",
            created_at=now - timedelta(hours=12),
            expires_at=now + timedelta(hours=36),
        )
        db.add(p3)
        db.flush()

        r3_rec = Receipt(
            id="rec_demo_103",
            payment_id=p3.id,
            original_filename="emeka_slip_50k.png",
            mime_type="image/png",
            size_bytes=290000,
            preview_url="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
            amount="50000.00",
            currency="NGN",
            reference="ZEN-NIP-992102",
            bank="Zenith Bank",
            status_text="Successful",
            sender_name="EMEKA NWOSU",
            recipient_name="TOLA FASHION",
            account_hint="0123456789",
            confidence=0.96,
            raw_text="ZENITH E-RECEIPT\nAmount: NGN 50,000.00\nBeneficiary: TOLA FASHION\nSender: EMEKA NWOSU\nRef: ZEN-NIP-992102",
        )
        db.add(r3_rec)

        tx3 = BankTransaction(
            id="btx_demo_103",
            payment_id=p3.id,
            provider="WEMA_NIP",
            provider_reference="ZEN-NIP-992102",
            payment_reference="PRF-2026-EMEK-03",
            amount="50000.00",
            currency="NGN",
            status="SUCCESS",
            sender_name="Emeka Nwosu",
            recipient_account_hint="0123456789",
            transaction_date=now - timedelta(hours=11),
        )
        db.add(tx3)

        v3 = Verification(
            id="ver_demo_103",
            payment_id=p3.id,
            status="MISMATCH",
            reason_code="AMOUNT_UNDERPAID",
            reason="Amount discrepancy: expected ₦60,000.00 but received ₦50,000.00.",
            verified_at=now - timedelta(hours=10, minutes=48),
            amount_match=False,
            reference_match=True,
            currency_match=True,
            merchant_match=True,
            date_match=True,
            comparison_json=json.dumps({
                "expected_amount": "60000.00",
                "receipt_amount": "50000.00",
                "received_amount": "50000.00",
                "receipt_reference": "ZEN-NIP-992102",
                "transaction_reference": "ZEN-NIP-992102",
            }),
            timeline_json=json.dumps([
                {"title": "Payment link generated", "timestamp": (now - timedelta(hours=12)).isoformat(), "state": "complete"},
                {"title": "Receipt uploaded with partial amount", "timestamp": (now - timedelta(hours=11)).isoformat(), "state": "complete"},
                {"title": "Amount mismatch flagged by PayPruf", "timestamp": (now - timedelta(hours=10, minutes=48)).isoformat(), "state": "error"},
            ]),
        )
        db.add(v3)

        # Scenario 4: NOT_RECEIVED
        p4 = Payment(
            id="pay_demo_104",
            merchant_id=DEMO_USER_ID,
            customer_name="Folake Adebayo",
            customer_phone="+2348056789012",
            amount="18500.00",
            currency="NGN",
            description="Casual Linen Shirt & Trousers",
            order_note="Standard delivery to Lekki",
            reference="PRF-2026-FOLA-04",
            public_token="tok_fola_44901",
            public_url="/pay/tok_fola_44901",
            status="NOT_RECEIVED",
            status_reason="Customer submitted receipt claim, but no matching credit found in merchant Wema records.",
            created_at=now - timedelta(hours=20),
            expires_at=now + timedelta(hours=10),
        )
        db.add(p4)
        db.flush()

        r4_rec = Receipt(
            id="rec_demo_104",
            payment_id=p4.id,
            original_filename="receipt_unverified.pdf",
            mime_type="application/pdf",
            size_bytes=184000,
            preview_url=None,
            amount="18500.00",
            currency="NGN",
            reference="UNCONFIRMED-9901",
            bank="Other Bank",
            status_text="Pending",
            sender_name="FOLAKE ADEBAYO",
            recipient_name="TOLA FASHION",
            account_hint="0123456789",
            confidence=0.85,
            raw_text="TRANSFER CLAIM\nAmount: NGN 18,500.00\nBeneficiary: TOLA FASHION",
        )
        db.add(r4_rec)

        v4 = Verification(
            id="ver_demo_104",
            payment_id=p4.id,
            status="NOT_RECEIVED",
            reason_code="NO_LEDGER_RECORD",
            reason="No incoming bank transaction matching this reference or amount was found in the merchant ledger.",
            verified_at=now - timedelta(hours=18, minutes=30),
            amount_match=False,
            reference_match=False,
            currency_match=True,
            merchant_match=True,
            date_match=False,
            comparison_json=json.dumps({
                "expected_amount": "18500.00",
                "receipt_amount": "18500.00",
                "received_amount": None,
                "receipt_reference": "UNCONFIRMED-9901",
                "transaction_reference": None,
            }),
            timeline_json=json.dumps([
                {"title": "Payment link generated", "timestamp": (now - timedelta(hours=20)).isoformat(), "state": "complete"},
                {"title": "Receipt uploaded by customer", "timestamp": (now - timedelta(hours=19)).isoformat(), "state": "complete"},
                {"title": "Ledger check: No funds recorded", "timestamp": (now - timedelta(hours=18, minutes=30)).isoformat(), "state": "error"},
            ]),
        )
        db.add(v4)

    db.commit()
