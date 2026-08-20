from app.firebase.firestore import firestore_service
import logging

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.firestore = firestore_service

    def create_payment(self, payment_data):
        """Create a new payment record."""
        # Ensure required fields are present
        required_fields = ['merchant_id', 'payment_link_id', 'receipt_url']
        for field in required_fields:
            if field not in payment_data:
                raise ValueError(f"Missing required field: {field}")

        return self.firestore.create_payment(payment_data)

    def get_payment_by_id(self, payment_id):
        """Get payment by ID."""
        return self.firestore.get_payment(payment_id)

    def get_payments_by_merchant(self, merchant_id, limit=50):
        """Get payments for a merchant."""
        return self.firestore.get_payments_by_merchant(merchant_id, limit)

    def update_payment(self, payment_id, update_data):
        """Update a payment record."""
        return self.firestore.update_payment(payment_id, update_data)

# Singleton instance
payment_service = PaymentService()