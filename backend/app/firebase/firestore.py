from google.cloud import firestore
from google.cloud.firestore_v1 import DELETE_FIELD
from app.firebase import get_firestore
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class FirestoreService:
    def __init__(self):
        self.db = get_firestore()

    # Merchant operations
    def create_merchant(self, merchant_data: Dict[str, Any]) -> str:
        """Create a new merchant document."""
        try:
            doc_ref = self.db.collection('merchants').document()
            merchant_data['created_at'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(merchant_data)
            logger.info(f"Created merchant with ID: {doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            logger.error(f"Error creating merchant: {e}")
            raise

    def get_merchant(self, merchant_id: str) -> Optional[Dict[str, Any]]:
        """Get merchant by ID."""
        try:
            doc_ref = self.db.collection('merchants').document(merchant_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting merchant {merchant_id}: {e}")
            raise

    def get_merchant_by_uid(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get merchant by Firebase UID."""
        try:
            merchants = self.db.collection('merchants').where('uid', '==', uid).limit(1).get()
            for merchant in merchants:
                data = merchant.to_dict()
                data['id'] = merchant.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting merchant by UID {uid}: {e}")
            raise

    def find_merchant_by_identifier(self, fields: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Find a merchant matching one of the provided identifier fields (email, phone, wema_account).

        Returns the first matching merchant document, or None.
        The returned dict includes which field matched under key '_match_field'.
        """
        try:
            for field, value in fields.items():
                if not value or field not in ('email', 'phone', 'wema_account'):
                    continue
                merchants = (
                    self.db.collection('merchants')
                    .where(field, '==', value)
                    .limit(1)
                    .get()
                )
                for m in merchants:
                    data = m.to_dict()
                    data['id'] = m.id
                    data['_match_field'] = field
                    return data
            return None
        except Exception as e:
            logger.error(f"Error finding merchant by identifier: {e}")
            raise

    # Payment link operations
    def create_payment_link(self, link_data: Dict[str, Any]) -> str:
        """Create a new payment link. link_data must include a unique 'link_id' key."""
        try:
            doc_ref = self.db.collection('payment_links').document(link_data['link_id'])
            link_data['created_at'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(link_data)
            logger.info(f"Created payment link: {link_data['link_id']}")
            return link_data['link_id']
        except Exception as e:
            logger.error(f"Error creating payment link: {e}")
            raise

    def get_payment_link(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get payment link by Firestore document ID."""
        try:
            doc_ref = self.db.collection('payment_links').document(doc_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting payment link {doc_id}: {e}")
            raise

    def get_payment_link_by_link_id(self, link_id: str) -> Optional[Dict[str, Any]]:
        """Get payment link by its public link_id field."""
        try:
            links = self.db.collection('payment_links').where('link_id', '==', link_id).limit(1).get()
            for doc in links:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting payment link by link_id {link_id}: {e}")
            raise

    def get_payment_links_by_merchant(self, merchant_id: str) -> List[Dict[str, Any]]:
        """Get all payment links for a merchant."""
        try:
            links = []
            query = self.db.collection('payment_links').where('merchant_id', '==', merchant_id)
            for doc in query.get():
                data = doc.to_dict()
                data['id'] = doc.id
                links.append(data)
            return links
        except Exception as e:
            logger.error(f"Error getting payment links for merchant {merchant_id}: {e}")
            raise

    # Payment operations
    def create_payment(self, payment_data: Dict[str, Any]) -> str:
        """Create a new payment record."""
        try:
            doc_ref = self.db.collection('payments').document()
            payment_data['created_at'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(payment_data)
            logger.info(f"Created payment with ID: {doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            logger.error(f"Error creating payment: {e}")
            raise

    def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """Get payment by ID."""
        try:
            doc_ref = self.db.collection('payments').document(payment_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting payment {payment_id}: {e}")
            raise

    def get_payments_by_merchant(self, merchant_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get payments for a merchant."""
        try:
            payments = []
            query = (self.db.collection('payments')
                    .where('merchant_id', '==', merchant_id)
                    .order_by('created_at', direction=firestore.Query.DESCENDING)
                    .limit(limit))
            for doc in query.get():
                data = doc.to_dict()
                data['id'] = doc.id
                payments.append(data)
            return payments
        except Exception as e:
            logger.error(f"Error getting payments for merchant {merchant_id}: {e}")
            raise

    def update_payment(self, payment_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a payment record."""
        try:
            doc_ref = self.db.collection('payments').document(payment_id)
            doc_ref.update(update_data)
            logger.info(f"Updated payment {payment_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating payment {payment_id}: {e}")
            raise

    # Bank transaction operations
    def create_bank_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """Create a bank transaction record."""
        try:
            doc_ref = self.db.collection('bank_transactions').document()
            transaction_data['created_at'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(transaction_data)
            logger.info(f"Created bank transaction with ID: {doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            logger.error(f"Error creating bank transaction: {e}")
            raise

    def get_bank_transactions_by_merchant(self, merchant_id: str) -> List[Dict[str, Any]]:
        """Get bank transactions for a merchant."""
        try:
            transactions = []
            query = self.db.collection('bank_transactions').where('merchant_id', '==', merchant_id)
            for doc in query.get():
                data = doc.to_dict()
                data['id'] = doc.id
                transactions.append(data)
            return transactions
        except Exception as e:
            logger.error(f"Error getting bank transactions for merchant {merchant_id}: {e}")
            raise

    # Session operations
    def create_session(self, token: str, uid: str) -> None:
        """Store a session token in Firestore with a TTL."""
        try:
            doc_ref = self.db.collection('sessions').document(token)
            doc_ref.set({
                'uid': uid,
                'created_at': firestore.SERVER_TIMESTAMP,
            })
            logger.info("Created session for uid=%s (token=%s...)", uid, token[:12])
        except Exception as e:
            logger.error("Error creating session: %s", e)
            raise

    def get_session_uid(self, token: str) -> Optional[str]:
        """Look up a session token and return the associated uid, or None if expired/missing."""
        try:
            doc_ref = self.db.collection('sessions').document(token)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                return data.get('uid')
            return None
        except Exception as e:
            logger.error("Error looking up session %s: %s", token[:12], e)
            raise

    def delete_session(self, token: str) -> None:
        """Delete a session token (logout)."""
        try:
            self.db.collection('sessions').document(token).delete()
        except Exception as e:
            logger.error("Error deleting session %s: %s", token[:12], e)
            raise

    # Fraud report operations
    def create_fraud_report(self, report_data: Dict[str, Any]) -> str:
        """Create a fraud report."""
        try:
            doc_ref = self.db.collection('fraud_reports').document()
            report_data['created_at'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(report_data)
            logger.info(f"Created fraud report with ID: {doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            logger.error(f"Error creating fraud report: {e}")
            raise

    def get_fraud_reports_by_account(self, account_number: str) -> List[Dict[str, Any]]:
        """Get fraud reports for an account number."""
        try:
            reports = []
            query = self.db.collection('fraud_reports').where('account_number', '==', account_number)
            for doc in query.get():
                data = doc.to_dict()
                data['id'] = doc.id
                reports.append(data)
            return reports
        except Exception as e:
            logger.error(f"Error getting fraud reports for account {account_number}: {e}")
            raise

# Singleton instance
firestore_service = FirestoreService()