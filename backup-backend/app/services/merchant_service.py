from app.firebase.firestore import firestore_service
import logging

logger = logging.getLogger(__name__)

class MerchantService:
    def __init__(self):
        self.firestore = firestore_service

    def create_merchant(self, merchant_data):
        """Create a new merchant."""
        # Ensure required fields are present
        required_fields = ['uid', 'business_name', 'email', 'bank_name', 'account_number', 'account_name']
        for field in required_fields:
            if field not in merchant_data:
                raise ValueError(f"Missing required field: {field}")

        return self.firestore.create_merchant(merchant_data)

    def get_merchant_by_id(self, merchant_id):
        """Get merchant by ID."""
        return self.firestore.get_merchant(merchant_id)

    def get_merchant_by_uid(self, uid):
        """Get merchant by Firebase UID."""
        return self.firestore.get_merchant_by_uid(uid)

# Singleton instance
merchant_service = MerchantService()