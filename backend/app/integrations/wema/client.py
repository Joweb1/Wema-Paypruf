"""
Wema Bank Client Interface
Defines the interface that both real and mock implementations must follow.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class WemaBankClient(ABC):
    """
    Abstract base class for Wema Bank client.
    Defines the interface for interacting with Wema Bank API.
    """

    @abstractmethod
    def get_transactions(self, merchant_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get transactions for a merchant.
        Returns a list of transaction dictionaries.
        """
        pass

    @abstractmethod
    def find_transaction_by_reference(self, merchant_id: str, reference: str) -> Optional[Dict[str, Any]]:
        """
        Find a transaction by its reference number.
        Returns the transaction dictionary if found, None otherwise.
        """
        pass

    @abstractmethod
    def get_transaction_status(self, transaction_id: str) -> Optional[str]:
        """
        Get the status of a specific transaction.
        Returns the status string if found, None otherwise.
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the Wema Bank service is available.
        Returns True if available, False otherwise.
        """
        pass