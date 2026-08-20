from app.firebase.firestore import firestore_service
import secrets
import logging

logger = logging.getLogger(__name__)


def _generate_link_id() -> str:
    """Generate a short, readable payment link ID."""
    return "pl_" + secrets.token_hex(6)  # e.g. pl_3a8f2c1b


class PaymentLinkService:
    def __init__(self):
        self.firestore = firestore_service

    def create_payment_link(self, link_data):
        """Create a new payment link with a readable link_id."""
        if 'merchant_id' not in link_data:
            raise ValueError("Missing merchant_id")

        link_data['link_id'] = _generate_link_id()
        if 'active' not in link_data:
            link_data['active'] = True

        return self.firestore.create_payment_link(link_data)

    def get_payment_link_by_id(self, doc_id):
        """Get payment link by Firestore document ID (backward-compat)."""
        return self.firestore.get_payment_link(doc_id)

    def get_payment_link_by_link_id(self, link_id):
        """Get payment link by its public link_id field."""
        return self.firestore.get_payment_link_by_link_id(link_id)

    def get_payment_links_by_merchant(self, merchant_id):
        """Get all payment links for a merchant."""
        return self.firestore.get_payment_links_by_merchant(merchant_id)


# Singleton instance
payment_link_service = PaymentLinkService()