from flask import Blueprint, request, jsonify
from app.firebase.auth import require_auth
from app.firebase.storage import storage_service
from app.services.payment_service import payment_service
from app.services.payment_link_service import payment_link_service
from app.services.verification_service import verification_service
from app.services.merchant_service import merchant_service
from app.integrations.ml.client import ml_client
from app.utils.validators import (
    validate_file_extension,
    validate_file_size,
    sanitize_filename,
)
import logging

logger = logging.getLogger(__name__)

payments_bp = Blueprint('payments', __name__)

# Configuration
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@payments_bp.route('/<link_id>/upload', methods=['POST'])
@require_auth
def upload_receipt(link_id):
    """
    Upload a receipt for a payment link and create a payment record.
    Expected: multipart/form-data with 'receipt' file field
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Get the payment link by its public link_id
        payment_link = payment_link_service.get_payment_link_by_link_id(link_id)
        if not payment_link:
            return jsonify({"error": "Payment link not found"}), 404

        # Verify that the payment link belongs to the authenticated merchant
        if payment_link['merchant_id'] != merchant['id']:
            return jsonify({"error": "Unauthorized access to payment link"}), 403

        # Check if payment link is active
        if not payment_link.get('active', True):
            return jsonify({"error": "Payment link is not active"}), 400

        # Check if file was uploaded
        if 'receipt' not in request.files:
            return jsonify({"error": "No receipt file provided"}), 400

        file = request.files['receipt']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Validate file
        if not validate_file_extension(file.filename, ALLOWED_EXTENSIONS):
            return jsonify({
                "error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        # Read file content
        file_content = file.read()

        # Validate file size
        if not validate_file_size(len(file_content), MAX_FILE_SIZE):
            return jsonify({
                "error": f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            }), 400

        # Sanitize filename
        filename = sanitize_filename(file.filename)

        # Upload to Firebase Storage
        receipt_url = storage_service.upload_file(
            file_content=file_content,
            filename=filename,
            content_type=file.content_type or 'application/octet-stream'
        )

        if not receipt_url:
            return jsonify({"error": "Failed to upload receipt"}), 500

        # Process receipt with ML service
        ml_result = ml_client.process_receipt(
            file_content=file_content,
            filename=filename,
            content_type=file.content_type or 'application/octet-stream'
        )

        # Prepare payment data
        payment_data = {
            "merchant_id": merchant['id'],
            "payment_link_id": link_id,
            "receipt_url": receipt_url,
            "verification_status": "PROCESSING",  # Initial status
        }

        # Add ML extracted data if available
        if ml_result:
            payment_data.update({
                "amount_claimed": ml_result.get("amount"),
                "transaction_reference": ml_result.get("transaction_reference"),
                "sender_name": ml_result.get("sender_name"),
                "receipt_bank": ml_result.get("bank_name"),
                # Store the raw ML result for debugging/reference
                "ml_extracted_data": ml_result
            })
        else:
            # If ML processing failed, we still create the payment but mark accordingly
            payment_data.update({
                "amount_claimed": None,
                "transaction_reference": None,
                "sender_name": None,
                "receipt_bank": None,
                "ml_processing_failed": True
            })

        # Create payment record
        payment_id = payment_service.create_payment(payment_data)

        # Return response
        response_data = {
            "payment_id": payment_id,
            "receipt_url": receipt_url,
            "verification_status": "PROCESSING",
            "message": "Receipt uploaded successfully. Processing started."
        }

        # Include ML results if available
        if ml_result:
            response_data["extracted_info"] = {
                "amount": ml_result.get("amount"),
                "transaction_reference": ml_result.get("transaction_reference"),
                "sender_name": ml_result.get("sender_name"),
                "bank_name": ml_result.get("bank_name")
            }

        return jsonify(response_data), 201

    except Exception as e:
        logger.error(f"Error uploading receipt for link {link_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500

@payments_bp.route('/<payment_id>', methods=['GET'])
@require_auth
def get_payment(payment_id):
    """
    Get a payment by ID.
    Only returns the payment if it belongs to the authenticated merchant.
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Get the payment
        payment = payment_service.get_payment_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Verify that the payment belongs to the authenticated merchant
        if payment['merchant_id'] != merchant['id']:
            return jsonify({"error": "Unauthorized access to payment"}), 403

        # Return payment information
        # Remove sensitive or internal fields if needed
        response_data = {
            "payment_id": payment['id'],
            "merchant_id": payment['merchant_id'],
            "payment_link_id": payment['payment_link_id'],
            "receipt_url": payment['receipt_url'],
            "amount_claimed": payment.get('amount_claimed'),
            "transaction_reference": payment.get('transaction_reference'),
            "sender_name": payment.get('sender_name'),
            "receipt_bank": payment.get('receipt_bank'),
            "verification_status": payment.get('verification_status'),
            "bank_transaction_id": payment.get('bank_transaction_id'),
            "created_at": payment.get('created_at'),
            "verified_at": payment.get('verified_at')
        }

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Error getting payment {payment_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500

@payments_bp.route('', methods=['GET'])
@require_auth
def get_payments():
    """
    Get payments for the authenticated merchant.
    Query parameters:
    - limit: number of payments to return (default 50)
    - offset: number of payments to skip (for pagination)
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Get payments
        payments = payment_service.get_payments_by_merchant(
            merchant_id=merchant['id'],
            limit=limit
        )

        # Apply offset manually (since our service doesn't support offset yet)
        if offset > 0:
            payments = payments[offset:]

        # Format response
        payments_list = []
        for payment in payments:
            payment_data = {
                "payment_id": payment['id'],
                "amount_claimed": payment.get('amount_claimed'),
                "transaction_reference": payment.get('transaction_reference'),
                "sender_name": payment.get('sender_name'),
                "receipt_bank": payment.get('receipt_bank'),
                "verification_status": payment.get('verification_status'),
                "created_at": payment.get('created_at')
            }
            payments_list.append(payment_data)

        return jsonify({
            "payments": payments_list,
            "count": len(payments_list),
            "limit": limit,
            "offset": offset
        }), 200

    except Exception as e:
        logger.error(f"Error getting payments for merchant: {e}")
        return jsonify({"error": "Internal server error"}), 500

@payments_bp.route('/<payment_id>/verify', methods=['POST'])
@require_auth
def verify_payment(payment_id):
    """
    Manually trigger verification for a payment.
    """
    try:
        # Get the authenticated merchant's UID from the request
        uid = request.uid

        # Get merchant information using Firebase UID
        merchant = merchant_service.get_merchant_by_uid(uid)
        if not merchant:
            return jsonify({"error": "Merchant not found"}), 404

        # Get the payment
        payment = payment_service.get_payment_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Verify that the payment belongs to the authenticated merchant
        if payment['merchant_id'] != merchant['id']:
            return jsonify({"error": "Unauthorized access to payment"}), 403

        # Trigger verification (service already saves result to Firestore)
        result = verification_service.verify_payment(payment_id)

        # Return verification result
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error verifying payment {payment_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500