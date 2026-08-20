"""
Helper utilities
"""

import hashlib
import re
import secrets
import string
from datetime import datetime

def generate_id(length: int = 16) -> str:
    """Generate a random ID."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_link_id() -> str:
    """Generate a payment link ID."""
    return f"link_{generate_id(8)}"

def generate_payment_id() -> str:
    """Generate a payment ID."""
    return f"pay_{generate_id(8)}"

def format_currency(amount: float, currency: str = "₦") -> str:
    """Format amount as currency."""
    return f"{currency}{amount:,.2f}"

def parse_currency(currency_string: str) -> float:
    """Parse currency string to float."""
    # Remove currency symbols and commas
    cleaned = re.sub(r'[^\d.-]', '', currency_string)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def get_current_timestamp() -> str:
    """Get current timestamp in ISO format."""
    return datetime.utcnow().isoformat() + "Z"

def is_recent(timestamp_str: str, hours: int = 24) -> bool:
    """Check if a timestamp is recent (within given hours)."""
    try:
        # Parse the timestamp
        if timestamp_str.endswith('Z'):
            timestamp_str = timestamp_str[:-1] + '+00:00'
        timestamp = datetime.fromisoformat(timestamp_str)
        now = datetime.utcnow()
        diff = now - timestamp
        return diff.total_seconds() < (hours * 3600)
    except Exception:
        return False

def mask_account_number(account_number: str) -> str:
    """Mask account number for display (show last 4 digits)."""
    if not account_number or len(account_number) <= 4:
        return account_number
    return "*" * (len(account_number) - 4) + account_number[-4:]

def mask_phone_number(phone_number: str) -> str:
    """Mask phone number for display."""
    if not phone_number or len(phone_number) <= 4:
        return phone_number
    return "*" * (len(phone_number) - 4) + phone_number[-4:]