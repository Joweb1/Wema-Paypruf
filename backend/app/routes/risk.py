from flask import Blueprint, request, jsonify
from app.firebase.auth import require_auth
from app.services.risk_service import risk_service
from app.services.merchant_service import merchant_service
import logging

logger = logging.getLogger(__name__)

risk_bp = Blueprint('risk', __name__)

@risk_bp.route('/<account_number>', methods=['GET'])
@require_auth
def get_risk_status(account_number):
    """
    Get risk status for an account number.
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Validate account number format (basic validation)
        if not account_number or not isinstance(account_number, str):
            return jsonify({"error": "Invalid account number"}), 400

        # Get risk status
        risk_status = risk_service.get_risk_status(account_number)

        return jsonify(risk_status), 200

    except Exception as e:
        logger.error(f"Error getting risk status for account {account_number}: {e}")
        return jsonify({"error": "Internal server error"}), 500