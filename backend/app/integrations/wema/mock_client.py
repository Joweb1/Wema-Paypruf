"""
Mock implementation of Wema Bank client for development and testing.
"""

from .client import WemaBankClient
import logging
from typing import List, Dict, Any, Optional
import random
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MockWemaBankClient(WemaBankClient):
    """
    Mock implementation of Wema Bank client for development and testing.
    Returns realistic-looking transaction data.
    """

    def __init__(self):
        # In a real implementation, we might initialize connection here
        self._mock_transactions = {}  # merchant_id -> list of transactions
        logger.info("Initialized MockWemaBankClient")

    def _generate_mock_transactions(self, merchant_id: str, count: int = 10) -> List[Dict[str, Any]]:
        """
        Generate mock transactions for a merchant.
        """
        if merchant_id in self._mock_transactions:
            return self._mock_transactions[merchant_id]

        transactions = []
        # Generate a few transactions with references that we can use for testing
        bases = [
            {"amount": 50000, "reference": "ABC123", "sender_name": "John Doe"},
            {"amount": 75000, "reference": "DEF456", "sender_name": "Jane Smith"},
            {"amount": 10000, "reference": "GHI789", "sender_name": "Bob Johnson"},
            {"amount": 120000, "reference": "JKL012", "sender_name": "Alice Brown"},
            {"amount": 30000, "reference": "MNO345", "sender_name": "Charlie Wilson"},
        ]

        base_time = datetime.utcnow() - timedelta(days=5)

        for i, base in enumerate(bases):
            # Create a transaction with some variation
            transaction = {
                "transaction_id": f"txn_{merchant_id}_{i:03d}",
                "merchant_id": merchant_id,
                "amount": base["amount"] + random.randint(-1000, 1000),
                "reference": base["reference"],
                "sender_name": base["sender_name"],
                "status": random.choice(["SUCCESSFUL", "SUCCESSFUL", "SUCCESSFUL", "PENDING"]),  # Mostly successful
                "timestamp": (base_time + timedelta(hours=i*2, minutes=random.randint(0,59))).isoformat() + "Z"
            }
            transactions.append(transaction)

        # Store for future calls
        self._mock_transactions[merchant_id] = transactions
        return transactions

    def get_transactions(self, merchant_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get transactions for a merchant (mock).
        """
        try:
            transactions = self._generate_mock_transactions(merchant_id)
            # Apply limit
            return transactions[:limit]
        except Exception as e:
            logger.error(f"Error in mock get_transactions for merchant {merchant_id}: {e}")
            return []

    def find_transaction_by_reference(self, merchant_id: str, reference: str) -> Optional[Dict[str, Any]]:
        """
        Find a transaction by its reference number (mock).
        """
        try:
            transactions = self._generate_mock_transactions(merchant_id)
            for tx in transactions:
                if tx.get('reference') == reference:
                    return tx
            return None
        except Exception as e:
            logger.error(f"Error in mock find_transaction_by_reference for merchant {merchant_id}, reference {reference}: {e}")
            return None

    def get_transaction_status(self, transaction_id: str) -> Optional[str]:
        """
        Get the status of a specific transaction (mock).
        """
        try:
            # We would need to search through all transactions, but for simplicity we'll just return a status
            # In a real mock, we might store transactions by ID as well.
            # For now, we'll return SUCCESSFUL for known transaction IDs or None.
            if transaction_id.startswith('txn_'):
                return "SUCCESSFUL"
            return None
        except Exception as e:
            logger.error(f"Error in mock get_transaction_status for transaction {transaction_id}: {e}")
            return None

    def is_available(self) -> bool:
        """
        Check if the Wema Bank service is available (mock).
        """
        # Mock is always available
        return True

# Singleton instance
mock_wema_client = MockWemaBankClient()