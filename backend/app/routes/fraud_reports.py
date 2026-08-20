from flask import Blueprint, request, jsonify
from app.firebase.auth import require_auth
from app.services.merchant_service import merchant_service
from app.firebase.firestore import firestore_service
import logging

logger = logging.getLogger(__name__)

fraud_reports_bp = Blueprint('fraud_reports', __name__)

@fraud_reports_bp.route('', methods=['POST'])
@require_auth
def create_fraud_report():
    """
    Create a fraud report.
    Expected JSON:
    {
        "account_number": "...",
        "bank_name": "...",
        "reason": "...",
        "payment_reference": "...",
        "evidence_url": "..."
    }
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        required_fields = ['account_number', 'bank_name', 'reason']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Prepare fraud report data
        report_data = {
            "account_number": data['account_number'],
            "bank_name": data['bank_name'],
            "reporter_id": merchant['id'],  # Link to merchant who made the report
            "reason": data['reason'],
            "payment_reference": data.get('payment_reference'),
            "evidence_url": data.get('evidence_url'),
            "status": "PENDING"
        }

        # Create fraud report
        report_id = firestore_service.create_fraud_report(report_data)

        return jsonify({
            "report_id": report_id,
            "message": "Fraud report submitted successfully"
        }), 201

    except Exception as e:
        logger.error(f"Error creating fraud report: {e}")
        return jsonify({"error": "Internal server error"}), 500

@fraud_reports_bp.route('/<account_number>', methods=['GET'])
@require_auth
def get_fraud_reports_by_account(account_number):
    """
    Get fraud reports for an account number.
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Validate account number
        if not account_number or not isinstance(account_number, str):
            return jsonify({"error": "Invalid account number"}), 400

        # Get fraud reports
        reports = firestore_service.get_fraud_reports_by_account(account_number)

        # Format response
        reports_list = []
        for report in reports:
            report_data = {
                "report_id": report['id'],
                "reason": report.get('reason'),
                "payment_reference": report.get('payment_reference'),
                "evidence_url": report.get('evidence_url'),
                "created_at": report.get('created_at'),
                "status": report.get('status')
            }
            reports_list.append(report_data)

        return jsonify({
            "account_number": account_number,
            "reports": reports_list,
            "count": len(reports_list)
        }), 200

    except Exception as e:
        logger.error(f"Error getting fraud reports for account {account_number}: {e}")
        return jsonify({"error": "Internal server error"}), 500