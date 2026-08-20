from flask import Blueprint, request, jsonify
from app.firebase.auth import require_auth
from app.services.payment_link_service import payment_link_service
from app.services.merchant_service import merchant_service
from app.utils.validators import validate_amount
from app.services.risk_service import risk_service
import logging

logger = logging.getLogger(__name__)

payment_links_bp = Blueprint('payment_links', __name__)


# ── Authenticated: merchant creates a payment link ──────────────────────

@payment_links_bp.route('', methods=['POST'])
@require_auth
def create_payment_link():
    """
    Create a new payment link for the authenticated merchant.

    Body (JSON):
        expected_amount (int, optional): Expected transfer amount in kobo.

    Returns:
        201 with link_id, merchant info, status.
        400 if data is invalid.
        404 if merchant not found.
    """
    try:
        uid = request.uid

        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        data = request.get_json(silent=True) or {}

        expected_amount = data.get('expected_amount')
        if expected_amount is not None and not validate_amount(expected_amount):
            return jsonify({"error": "Invalid expected amount"}), 400

        link_data = {
            "merchant_id": merchant['id'],
            "expected_amount": expected_amount,
            "active": True,
        }

        link_id = payment_link_service.create_payment_link(link_data)

        return jsonify({
            "link_id": link_id,
            "merchant_id": merchant['id'],
            "merchant_name": merchant.get('business_name'),
            "expected_amount": expected_amount,
            "active": True,
            "message": "Payment link created successfully",
        }), 201

    except ValueError as e:
        logger.error("Validation error creating payment link: %s", e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Error creating payment link: %s", e)
        return jsonify({"error": "Internal server error"}), 500


# ── Public: customer views a payment link ────────────────────────────────

@payment_links_bp.route('/<link_id>', methods=['GET'])
def get_payment_link(link_id):
    """
    Public endpoint — no authentication required.

    Returns customer-facing payment link information:
        - merchant name
        - bank name
        - account name
        - account number
        - expected amount
        - PayPruf risk information (by merchant's account number)
        - link active status

    Does NOT expose merchant UID, email, phone, or internal IDs.
    """
    try:
        link = payment_link_service.get_payment_link_by_link_id(link_id)
        if not link:
            return jsonify({"error": "Payment link not found"}), 404

        if not link.get('active', True):
            return jsonify({"error": "Payment link is no longer active"}), 410

        merchant = merchant_service.get_merchant_by_id(link.get('merchant_id'))
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Fetch risk information for the merchant's account number
        account_number = merchant.get('account_number', '')
        risk_info = {"status": "NO_REPORTS", "message": "", "reports_count": 0}
        if account_number:
            try:
                risk_info = risk_service.get_risk_status(account_number)
            except Exception:
                logger.warning("Failed to fetch risk info for account %s", account_number)

        # Build public-safe response
        return jsonify({
            "merchant_name": merchant.get('business_name'),
            "bank_name": merchant.get('bank_name'),
            "account_name": merchant.get('account_name'),
            "account_number": merchant.get('account_number'),
            "expected_amount": link.get('expected_amount'),
            "active": link.get('active', True),
            "risk": {
                "status": risk_info.get('status'),
                "message": risk_info.get('message'),
                "reports_count": risk_info.get('reports_count', 0),
            },
            "created_at": link.get('created_at'),
        }), 200

    except Exception as e:
        logger.error("Error getting payment link %s: %s", link_id, e)
        return jsonify({"error": "Internal server error"}), 500