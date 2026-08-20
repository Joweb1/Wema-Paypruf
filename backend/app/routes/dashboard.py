from flask import Blueprint, request, jsonify
from app.firebase.auth import require_auth
from app.services.dashboard_service import dashboard_service
from app.services.merchant_service import merchant_service
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/summary', methods=['GET'])
@require_auth
def get_dashboard_summary():
    """
    Get dashboard summary for the authenticated merchant.
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Get dashboard summary
        summary = dashboard_service.get_dashboard_summary(merchant['id'])

        return jsonify(summary), 200

    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        return jsonify({"error": "Internal server error"}), 500