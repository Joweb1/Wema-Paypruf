"""
Input validation utilities
"""

import re
from typing import Tuple, Optional

def validate_email(email: str) -> bool:
    """Validate email format."""
    if not email:
        return False
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_phone_number(phone: str) -> bool:
    """Validate phone number format (simple international format)."""
    if not phone:
        return False
    # Remove spaces, dashes, parentheses
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    # Should start with + followed by digits
    pattern = r'^\+[1-9]\d{1,14}$'
    return re.match(pattern, cleaned) is not None

def validate_amount(amount) -> bool:
    """Validate that amount is a positive number."""
    try:
        val = float(amount)
        return val > 0
    except (ValueError, TypeError):
        return False

def validate_transaction_reference(ref: str) -> bool:
    """Validate transaction reference format."""
    if not ref or not isinstance(ref, str):
        return False
    # Allow alphanumeric and some special characters, reasonable length
    pattern = r'^[A-Za-z0-9\-_]{3,50}$'
    return re.match(pattern, ref) is not None

def validate_file_extension(filename: str, allowed_extensions: list) -> bool:
    """Validate file extension."""
    if not filename:
        return False
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)

def validate_file_size(file_size: int, max_size: int) -> bool:
    """Validate file size."""
    return 0 < file_size <= max_size

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    # Remove path separators and other potentially dangerous characters
    filename = re.sub(r'[^\w\-_\.]', '_', filename)
    # Limit length
    if len(filename) > 255:
        if '.' in filename:
            name, ext = filename.rsplit('.', 1)
            max_name_len = 255 - len(ext) - 1
            filename = name[:max_name_len] + '.' + ext
        else:
            filename = filename[:255]
    return filename