from app.firebase.firestore import firestore_service
from app.services.merchant_service import merchant_service
from app.integrations.wema import wema_client
from app.integrations.ml import ml_client
import logging
from typing import Dict, Any, Optional
from google.cloud import firestore as gc_firestore

logger = logging.getLogger(__name__)

class VerificationService:
    def __init__(self):
        self.firestore = firestore_service
        self.merchant_service = merchant_service
        self.wema_client = wema_client
        self.ml_client = ml_client

    def verify_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Verify a payment by comparing receipt information with bank transactions.
        Returns verification result with status.
        Also saves the verification result to Firestore.
        """
        try:
            # Get payment record
            payment = self.firestore.get_payment(payment_id)
            if not payment:
                return {
                    "status": "UNABLE_TO_VERIFY",
                    "reason": "Payment record not found"
                }

            # Get merchant information
            merchant = self.merchant_service.get_merchant_by_id(payment['merchant_id'])
            if not merchant:
                return {
                    "status": "UNABLE_TO_VERIFY",
                    "reason": "Merchant not found"
                }

            # Extract receipt information from payment record
            receipt_amount = payment.get('amount_claimed')
            receipt_reference = payment.get('transaction_reference')
            receipt_sender_name = payment.get('sender_name')
            receipt_bank = payment.get('receipt_bank')

            # If we don't have reference, we can't do precise matching
            if not receipt_reference:
                result = {
                    "status": "UNABLE_TO_VERIFY",
                    "reason": "Transaction reference not available from receipt"
                }
                self._save_verification_result(payment_id, result)
                return result

            # Check if Wema client is available
            if not self.wema_client.is_available():
                result = {
                    "status": "UNABLE_TO_VERIFY",
                    "reason": "Wema bank service unavailable"
                }
                self._save_verification_result(payment_id, result)
                return result

            # Query Wema for transactions by reference
            try:
                bank_transaction = self.wema_client.find_transaction_by_reference(
                    merchant_id=payment['merchant_id'],
                    reference=receipt_reference
                )
            except Exception as e:
                logger.warning(f"Error finding transaction by reference: {e}")
                result = {
                    "status": "UNABLE_TO_VERIFY",
                    "reason": f"Error querying Wema bank: {str(e)}"
                }
                self._save_verification_result(payment_id, result)
                return result

            if not bank_transaction:
                result = {
                    "status": "NOT_RECEIVED",
                    "reason": "No matching transaction found in bank records"
                }
                self._save_verification_result(payment_id, result)
                return result

            # Verify the transaction belongs to the correct merchant
            if bank_transaction.get('merchant_id') != payment['merchant_id']:
                result = {
                    "status": "MISMATCH",
                    "reason": "Transaction does not belong to this merchant"
                }
                self._save_verification_result(payment_id, result)
                return result

            # Check transaction status
            bank_status = bank_transaction.get('status', '').upper()
            if bank_status == 'PENDING':
                result = {
                    "status": "PENDING",
                    "reason": "Transaction is still pending",
                    "bank_transaction_id": bank_transaction.get('transaction_id')
                }
                self._save_verification_result(payment_id, result)
                return result
            elif bank_status != 'SUCCESSFUL':
                result = {
                    "status": "MISMATCH",
                    "reason": f"Transaction status is {bank_status}",
                    "bank_transaction_id": bank_transaction.get('transaction_id')
                }
                self._save_verification_result(payment_id, result)
                return result

            # Compare amounts
            bank_amount = bank_transaction.get('amount')
            if receipt_amount is not None and bank_amount is not None:
                try:
                    receipt_amount_float = float(receipt_amount)
                    bank_amount_float = float(bank_amount)
                    if abs(receipt_amount_float - bank_amount_float) > 0.01:  # Allow for small rounding differences
                        result = {
                            "status": "MISMATCH",
                            "reason": f"Amount mismatch: receipt shows {receipt_amount}, bank shows {bank_amount}",
                            "bank_transaction_id": bank_transaction.get('transaction_id')
                        }
                        self._save_verification_result(payment_id, result)
                        return result
                except ValueError:
                    result = {
                        "status": "MISMATCH",
                        "reason": "Invalid amount format in receipt or bank transaction",
                        "bank_transaction_id": bank_transaction.get('transaction_id')
                    }
                    self._save_verification_result(payment_id, result)
                    return result

            # Additional verification: check sender name if available (log warning if mismatch)
            if receipt_sender_name and bank_transaction.get('sender_name'):
                if receipt_sender_name.lower() != bank_transaction.get('sender_name', '').lower():
                    logger.warning(f"Sender name mismatch: receipt={receipt_sender_name}, bank={bank_transaction.get('sender_name')}")

            # All checks passed
            result = {
                "status": "CONFIRMED",
                "reason": "Payment confirmed successfully",
                "bank_transaction_id": bank_transaction.get('transaction_id'),
                "verified_amount": bank_amount
            }
            self._save_verification_result(payment_id, result)
            return result

        except Exception as e:
            logger.error(f"Error verifying payment {payment_id}: {e}")
            result = {
                "status": "UNABLE_TO_VERIFY",
                "reason": f"Verification failed due to system error: {str(e)}"
            }
            # Try to save the error result, but if this fails we still return the result
            try:
                self._save_verification_result(payment_id, result)
            except Exception as save_error:
                logger.error(f"Failed to save verification result: {save_error}")
            return result

    def _save_verification_result(self, payment_id: str, result: Dict[str, Any]) -> None:
        """Save verification result to Firestore."""
        try:
            update_data = {
                "verification_status": result['status'],
                "verified_at": gc_firestore.SERVER_TIMESTAMP
            }
            # Add bank transaction ID if available in result
            if 'bank_transaction_id' in result:
                update_data['bank_transaction_id'] = result['bank_transaction_id']
            # Add verified amount if available in result
            if 'verified_amount' in result:
                update_data['verified_amount'] = result['verified_amount']

            self.firestore.update_payment(payment_id, update_data)
            logger.info(f"Saved verification result for payment {payment_id}: {result['status']}")
        except Exception as e:
            logger.error(f"Error saving verification result for payment {payment_id}: {e}")
            raise

# Singleton instance
verification_service = VerificationService()