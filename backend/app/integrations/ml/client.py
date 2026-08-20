"""
ML/OCR Service Client
Handles communication with the ML service for receipt processing.
"""

import logging
from typing import Dict, Any, Optional
import random
from datetime import datetime

logger = logging.getLogger(__name__)

class MLClient:
    """
    Client for interacting with ML/OCR service.
    For development, provides a mock implementation that returns realistic data.
    """

    def __init__(self):
        # In a real implementation, we would initialize connection to the ML service here
        logger.info("Initialized MLClient (using mock implementation)")

    def process_receipt(self, file_content: bytes, filename: str, content_type: str) -> Optional[Dict[str, Any]]:
        """
        Process a receipt image/file through the ML/OCR service.
        Returns extracted information or None if processing failed.

        Expected response format:
        {
            "amount": 50000,
            "transaction_reference": "ABC123",
            "transaction_date": "2026-08-20",
            "sender_name": "John Doe",
            "bank_name": "Wema Bank"
        }
        """
        try:
            # In a real implementation, we would send the file to the ML service
            # For now, we'll return mock data based on the filename or random data

            logger.info(f"Processing receipt: {filename} (mock implementation)")

            # Mock response - in reality this would come from the ML service
            # We'll vary the response slightly to make it more realistic
            amount_options = [50000, 75000, 10000, 120000, 30000, 25000, 200000]
            reference_options = ["ABC123", "DEF456", "GHI789", "JKL012", "MNO345", "PQR678", "STU901"]
            sender_options = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown", "Charlie Wilson", "David Lee", "Sarah Davis"]

            # Sometimes return slightly different data to simulatevariations
            if random.random() < 0.1:  # 10% chance of "failed" processing
                return None

            result = {
                "amount": random.choice(amount_options),
                "transaction_reference": random.choice(reference_options),
                "transaction_date": datetime.utcnow().strftime("%Y-%m-%d"),
                "sender_name": random.choice(sender_options),
                "bank_name": "Wema Bank"
            }

            logger.info(f"ML processing result: {result}")
            return result

        except Exception as e:
            logger.error(f"Error processing receipt with ML service: {e}")
            return None

    def is_available(self) -> bool:
        """
        Check if the ML service is available.
        Returns True if available, False otherwise.
        """
        # Mock is always available
        return True

# Singleton instance
ml_client = MLClient()